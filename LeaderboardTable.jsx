import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLeaderboardData } from '../../hooks/useFirebase';

const JournalistLeaderboard = () => {
  const { journalists, loading, lastUpdated, dateRange } = useLeaderboardData(30);

  console.log('LeaderboardTable render:', { journalists, loading, lastUpdated, dateRange }); // Debug log

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-light text-gray-800 mb-1">Journalist Leaderboard</h1>
          <div className="text-sm text-gray-600">Top 5 journalists for the last 30 days</div>
          <div className="text-sm text-gray-500">{dateRange}</div>
          <div className="h-px bg-gray-200 w-24 mt-4"></div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Publication</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">30-Day Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {journalists && journalists.length > 0 ? (
                  journalists.map((journalist, index) => (
                    <tr 
                      key={journalist.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                        {journalist.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {journalist.publication}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 text-right whitespace-nowrap font-medium">
                        {journalist.points}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-sm text-gray-500 text-center">
                      No journalists found in the last 30 days
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="mt-4 text-sm text-gray-400">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default JournalistLeaderboard;