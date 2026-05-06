'use client';

import { useState } from 'react';

interface QuestBuilderProps {
  campaignId: string;
  onSuccess?: () => void;
}

export function QuestBuilder({ campaignId, onSuccess }: QuestBuilderProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questType, setQuestType] = useState<'TWITTER_FOLLOW' | 'TWITTER_RETWEET' | 'TWITTER_LIKE'>('TWITTER_FOLLOW');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardUsdc: '',
    maxCompletions: '',
    minSybilScore: '40',
    twitterHandle: '',
    tweetUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const requirements: Record<string, string> = {};
      
      if (questType === 'TWITTER_FOLLOW') {
        requirements.targetHandle = formData.twitterHandle;
      } else if (questType === 'TWITTER_RETWEET' || questType === 'TWITTER_LIKE') {
        requirements.tweetUrl = formData.tweetUrl;
      }

      const response = await fetch(`/api/console/campaigns/${campaignId}/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: questType,
          title: formData.title,
          description: formData.description,
          rewardUsdc: formData.rewardUsdc,
          maxCompletions: parseInt(formData.maxCompletions),
          minSybilScore: parseInt(formData.minSybilScore),
          requirements,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create quest');
      }

      setFormData({
        title: '',
        description: '',
        rewardUsdc: '',
        maxCompletions: '',
        minSybilScore: '40',
        twitterHandle: '',
        tweetUrl: '',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating quest:', error);
      alert('Failed to create quest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="type" className="block text-sm font-medium">
          Quest Type
        </label>
        <select
          id="type"
          value={questType}
          onChange={(e) => setQuestType(e.target.value as any)}
          className={inputClass}
        >
          <option value="TWITTER_FOLLOW">Twitter Follow</option>
          <option value="TWITTER_RETWEET">Twitter Retweet</option>
          <option value="TWITTER_LIKE">Twitter Like</option>
        </select>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="rewardUsdc" className="block text-sm font-medium">
            Reward <span className="text-accent">(USDC)</span>
          </label>
          <input
            type="number"
            id="rewardUsdc"
            required
            min="0"
            step="0.01"
            value={formData.rewardUsdc}
            onChange={(e) => setFormData({ ...formData, rewardUsdc: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="maxCompletions" className="block text-sm font-medium">
            Max Completions
          </label>
          <input
            type="number"
            id="maxCompletions"
            required
            min="1"
            value={formData.maxCompletions}
            onChange={(e) => setFormData({ ...formData, maxCompletions: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="minSybilScore" className="block text-sm font-medium">
          Minimum Sybil Score (0-100)
        </label>
        <input
          type="number"
          id="minSybilScore"
          required
          min="0"
          max="100"
          value={formData.minSybilScore}
          onChange={(e) => setFormData({ ...formData, minSybilScore: e.target.value })}
          className={inputClass}
        />
      </div>

      {questType === 'TWITTER_FOLLOW' && (
        <div>
          <label htmlFor="twitterHandle" className="block text-sm font-medium">
            Twitter Handle (without @)
          </label>
          <input
            type="text"
            id="twitterHandle"
            required
            value={formData.twitterHandle}
            onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      {(questType === 'TWITTER_RETWEET' || questType === 'TWITTER_LIKE') && (
        <div>
          <label htmlFor="tweetUrl" className="block text-sm font-medium">
            Tweet URL
          </label>
          <input
            type="url"
            id="tweetUrl"
            required
            value={formData.tweetUrl}
            onChange={(e) => setFormData({ ...formData, tweetUrl: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Quest'}
        </button>
      </div>
    </form>
  );
}
