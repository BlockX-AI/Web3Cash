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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Quest Type
        </label>
        <select
          id="type"
          value={questType}
          onChange={(e) => setQuestType(e.target.value as any)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="TWITTER_FOLLOW">Twitter Follow</option>
          <option value="TWITTER_RETWEET">Twitter Retweet</option>
          <option value="TWITTER_LIKE">Twitter Like</option>
        </select>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="rewardUsdc" className="block text-sm font-medium text-gray-700">
            Reward (USDC)
          </label>
          <input
            type="number"
            id="rewardUsdc"
            required
            min="0"
            step="0.01"
            value={formData.rewardUsdc}
            onChange={(e) => setFormData({ ...formData, rewardUsdc: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="maxCompletions" className="block text-sm font-medium text-gray-700">
            Max Completions
          </label>
          <input
            type="number"
            id="maxCompletions"
            required
            min="1"
            value={formData.maxCompletions}
            onChange={(e) => setFormData({ ...formData, maxCompletions: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="minSybilScore" className="block text-sm font-medium text-gray-700">
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {questType === 'TWITTER_FOLLOW' && (
        <div>
          <label htmlFor="twitterHandle" className="block text-sm font-medium text-gray-700">
            Twitter Handle (without @)
          </label>
          <input
            type="text"
            id="twitterHandle"
            required
            value={formData.twitterHandle}
            onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      )}

      {(questType === 'TWITTER_RETWEET' || questType === 'TWITTER_LIKE') && (
        <div>
          <label htmlFor="tweetUrl" className="block text-sm font-medium text-gray-700">
            Tweet URL
          </label>
          <input
            type="url"
            id="tweetUrl"
            required
            value={formData.tweetUrl}
            onChange={(e) => setFormData({ ...formData, tweetUrl: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Quest'}
        </button>
      </div>
    </form>
  );
}
