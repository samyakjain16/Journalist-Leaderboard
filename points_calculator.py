# points_calculator.py

class PointsCalculator:
    def __init__(self, config):
        self.config = config  # Points configuration

    def calculate_daily_points(self, metrics):
        """Calculate daily points for a journalist"""
        return (
            metrics['front_page'] * self.config['front_page'] +
            metrics['exclusive'] * self.config['exclusive'] +
            metrics['standard'] * self.config['standard']
        )

    def calculate_overall_points(self, daily_scores, journalist_id):
        """Calculate overall points for a journalist"""
        total_points = 0
        for date in daily_scores:
            journalist_info = next(
                (j for j in daily_scores[date]['journalist_info']
                 if j['id'] == journalist_id), None
            )
            if journalist_info:
                total_points += journalist_info.get('daily_points', 0)
        return total_points
