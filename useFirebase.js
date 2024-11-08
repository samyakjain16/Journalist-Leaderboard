import { useEffect, useState, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../lib/firebase';

export const useLeaderboardData = (days = 30) => {
  const [data, setData] = useState({
    rawScores: {},
    loading: true,
    lastUpdated: null
  });

  useEffect(() => {
    const dailyScoresRef = ref(database, 'daily_scores');
    
    const unsubscribe = onValue(dailyScoresRef, (snapshot) => {
      if (snapshot.exists()) {
        setData({
          rawScores: snapshot.val(),
          loading: false,
          lastUpdated: new Date().toISOString()
        });
      } else {
        setData({
          rawScores: {},
          loading: false,
          lastUpdated: new Date().toISOString()
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const processedData = useMemo(() => {
    if (data.loading) return { journalists: [], dateRange: '' };

    // Calculate 30 days ago date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Set to start of day

    const journalistPoints = new Map();
    
    Object.entries(data.rawScores).forEach(([date, dayData]) => {
      // Parse date and set to start of day for consistent comparison
      const scoreDate = new Date(date);
      scoreDate.setHours(0, 0, 0, 0);
      
      // Only process dates within the last 30 days
      if (scoreDate >= thirtyDaysAgo && dayData.journalist_info) {
        dayData.journalist_info.forEach(journalist => {
          const currentPoints = journalistPoints.get(journalist.id) || {
            id: journalist.id,
            name: journalist.name,
            publication: journalist.publication,
            points: 0
          };
          
          const pointsToAdd = Number(journalist.daily_points) || 0;
          currentPoints.points += pointsToAdd;
          
          console.log(`Date: ${date}, Adding ${pointsToAdd} points for ${journalist.name}, total: ${currentPoints.points}`);
          
          journalistPoints.set(journalist.id, currentPoints);
        });
      }
    });

    const journalists = Array.from(journalistPoints.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    return {
      journalists,
      dateRange: `${thirtyDaysAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}`
    };
  }, [data.rawScores, days]);

  return {
    ...processedData,
    loading: data.loading,
    lastUpdated: data.lastUpdated
  };
};