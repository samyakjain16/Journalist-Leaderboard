# Journalist Leaderboard 📰

An Automated/Human in the loop real-time system for tracking and ranking journalists based on their published articles.


## Task Requirements:

- Create a journalist leaderboard table that automatically refreshes every day. The table will show the top 5 journalists based on a 30-day moving average of points. The leaderboard will assign points based on journalists' number of front page splashes, number of exclusives, and the number of articles (in print). Initially, the scope is The Australian Financial Review and The Australian.

- Currently: You could track this manually by looking at the print editions of both publications every day and assigning points based on # of front page splashes and # of articles, and recording points in Excel. Tech stack: The sources would be the 'Today's Edition' PDF of the AFR and The Australian.

- Acceptance: - The ideal output is a table that refreshes every morning at 9am based on an updated 30 day moving average - The table should be able to be hosted on a webpage.
There should be an ability to edit how the leaderboard assigns points, and to have legibility into how points have been assigned (in the backend)

## 📋 Overview

The Journalist Leaderboard System tracks and ranks journalists based on their publications in The Australian Financial Review and The Australian. The system updates daily, providing a real-time leaderboard of the top 5 journalists based on a 30-day moving average of points.

### Key Features

- 🔄 Automatic daily updates at 9 AM
- 📊 30-day moving average calculations
- 🏆 Top 5 journalists leaderboard
- ⚙️ Configurable point system
- 📱 Responsive web interface

## 🏗️ System Architecture

![Screenshot 2024-11-08 at 11 33 36 PM](https://github.com/user-attachments/assets/de93aa1c-dc82-4226-8e1f-21006888b07f)


### Technology Stack

#### Firebase Platform
- **Firebase Storage**: PDF storage and management
- **Firebase Realtime Database (RTDB)**: Real-time data synchronization
- **Firebase Cloud Functions**: Serverless PDF processing

#### Google Workspace
- **Google Sheets**: Data management and calculations
- **Google Apps Script**: Business logic automation

#### Frontend
- **React.js**: User interface
- **Tailwind CSS**: Styling

#### LLM Integration
- **Claude AI API**: PDF text extraction and processing

## 💾 Data Structure

### Firebase RTDB Schema
```json
{
  "daily_scores": {
    "YYYY-MM-DD": {
      "journalist_info": [
        {
          "id": "string",
          "name": "string",
          "publication": "string",
          "metrics": {
            "front_page": number,
            "exclusive": number,
            "standard": number
          },
          "daily_points": number
        }
      ]
    }
  }
}
```

### Google Sheets Structure

1. **Daily Entries Sheet**
   - Primary data repository
   - Columns: Date, ID, Name, Publication, Front Page, Exclusive, Standard, Daily Points
   - Automated point calculations
  
![Screenshot 2024-11-08 at 11 47 45 PM](https://github.com/user-attachments/assets/18900af9-79b7-4cc5-b008-0767c11bff20)


2. **Master Sheet**
   - Overall performance tracking
   - Columns: ID, Name, Overall Points
   - Auto-updates from Daily Entries

![Screenshot 2024-11-08 at 11 47 52 PM](https://github.com/user-attachments/assets/8fee4bc7-050a-4b79-bbd0-fae49ba89aa9)


3. **Configuration Sheet**
   - System settings and point values
   - Configurable without code changes



4. **New Data Sheet**
   - Temporary storage for processed data
   - Bridge between PDF processing and main system

## 🔄 System Workflow

1. **PDF Upload**
   - PDFs uploaded to Firebase Storage
   - Triggers Cloud Functions

2. **Data Processing**
   - Claude AI extracts article information
   - Data structured and validated
   - Points calculated based on configuration

3. **Data Storage**
   - Results stored in RTDB
   - Google Sheets synchronized
   - Leaderboard updated



## 💰 Costs

Claude AI API Processing:
- $0.008 per image
- Approximately $8 per 1000 images

## 🔧 Configuration

Point values can be adjusted in the Configuration Sheet:

| Article Type | Default Points |
|--------------|----------------|
| Front Page   | 100           |
| Exclusive    | 50           |
| Standard     | 10            |

## 🚀 Getting Started

1. Set up Firebase project
2. Configure Google Workspace
3. Deploy frontend application
4. Set up Claude AI API integration
5. Configure automated workflows

## 📝 Notes

- System operates fully automated
- Requires minimal manual intervention
- Point system can be adjusted without code changes
- Real-time updates ensure current data

![Screenshot 2024-11-09 at 3 00 43 AM](https://github.com/user-attachments/assets/c2be25f4-fa8f-405a-9f47-822b8353ee48)


https://github.com/user-attachments/assets/2e1e2e13-c444-4697-9a60-19397b8513e2



