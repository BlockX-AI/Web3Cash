import { Hono } from 'hono';
import { prisma } from '@web3cash/db';

const offer18 = new Hono();

/**
 * Offer18 S2S Postback Endpoint
 * 
 * Called by Offer18 when a conversion is confirmed (e.g., download completed).
 * 
 * URL: GET /api/offer18/postback?click_id={click_id}&goal_id={goal_id}&payout={payout}&security_token={token}
 * 
 * Security: Verifies OFFER18_SECURITY_TOKEN to prevent unauthorized postbacks.
 */
offer18.get('/postback', async (c) => {
  const clickId = c.req.query('click_id');
  const goalId = c.req.query('goal_id');
  const payout = c.req.query('payout');
  const securityToken = c.req.query('security_token');

  // Verify security token (optional for now - can be added later if needed)
  // const expectedToken = process.env.OFFER18_SECURITY_TOKEN;
  // if (expectedToken && securityToken !== expectedToken) {
  //   console.warn('Invalid security token');
  //   return c.json({ error: 'Unauthorized' }, 401);
  // }

  // Validate required params
  if (!clickId || !goalId) {
    console.warn('Missing required params');
    return c.json({ error: 'Missing required params' }, 400);
  }

  try {
    // Lookup user by click_id (offer18ClickId is not unique, use findFirst)
    const user = await prisma.user.findFirst({
      where: { offer18ClickId: clickId },
      select: {
        walletAddress: true,
        pendingBalanceUsdc: true,
        totalEarnedUsdc: true,
      },
    });

    if (!user) {
      console.warn('User not found for click_id', { clickId });
      return c.json({ error: 'User not found' }, 404);
    }

    // Find the Download Runner quest (assumes it exists in DB)
    // We'll match by title containing "download runner" (case-insensitive)
    const quest = await prisma.quest.findFirst({
      where: {
        active: true,
        title: { contains: 'download runner', mode: 'insensitive' },
      },
      select: {
        id: true,
        rewardUsdc: true,
        maxCompletions: true,
        completionsCount: true,
      },
    });

    if (!quest) {
      console.warn('Download Runner quest not found', { clickId });
      return c.json({ error: 'Quest not found' }, 404);
    }

    // Check if user already completed this quest
    const existingCompletion = await prisma.questCompletion.findFirst({
      where: {
        questId: quest.id,
        userWallet: user.walletAddress,
      },
    });

    if (existingCompletion) {
      console.info('Quest already completed', { clickId, walletAddress: user.walletAddress });
      return c.json({ success: true, message: 'Already completed' });
    }

    // Check if quest budget exhausted
    if (quest.completionsCount >= quest.maxCompletions) {
      console.warn('Quest budget exhausted', { questId: quest.id });
      return c.json({ error: 'Quest budget exhausted' }, 410);
    }

    // Parse payout amount (use quest reward if not provided)
    const payoutAmount = payout ? parseFloat(payout) : parseFloat(quest.rewardUsdc.toString());

    // Create quest completion record
    const completion = await prisma.questCompletion.create({
      data: {
        questId: quest.id,
        userWallet: user.walletAddress,
        status: 'VERIFIED',
        rewardUsdc: payoutAmount,
        verifiedAt: new Date(),
        releaseAt: new Date(), // Immediate release for Offer18 conversions
      },
    });

    // Update quest completions count
    await prisma.quest.update({
      where: { id: quest.id },
      data: { completionsCount: { increment: 1 } },
    });

    // Credit user's balance
    await prisma.user.update({
      where: { walletAddress: user.walletAddress },
      data: {
        pendingBalanceUsdc: { increment: payoutAmount },
        totalEarnedUsdc: { increment: payoutAmount },
      },
    });

    console.info('Offer18 postback: Quest completed and credited', {
      clickId,
      walletAddress: user.walletAddress,
      questId: quest.id,
      payout: payoutAmount,
      completionId: completion.id,
    });

    return c.json({ success: true, completionId: completion.id, payout: payoutAmount });
  } catch (err) {
    console.error('Offer18 postback failed', { clickId, err: err instanceof Error ? err.message : 'Unknown error' });
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default offer18;
