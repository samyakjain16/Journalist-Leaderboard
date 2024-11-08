 Journalist Leaderboard System
(Completely Automated and Real time)
Task summary:
Create a journalist leaderboard table that automatically refreshes every day. The table will show the top 5 journalists based on a 30-day moving average of points. The leaderboard will assign points based on journalists' number of front page splashes, number of exclusives, and the number of articles (in print). Initially, the scope is The Australian Financial Review and The Australian.
Currently: You could track this manually by looking at the print editions of both publications every day and assigning points based on # of front page splashes and # of articles, and recording points in Excel. Tech stack: The sources would be the 'Today's Edition' PDF of the AFR and The Australian.
Acceptance: - The ideal output is a table that refreshes every morning at 9am based on an updated 30 day moving average - The table should be able to be hosted on a webpage.
There should be an ability to edit how the leaderboard assigns points, and to have legibility into how points have been assigned (in the backend)
System Architecture
 
 System Data Flow
 Tools and Technologies Used in
1. Firebase Platform Firebase Storage
● Purpose: Stores uploaded PDF files ● Implementation:
○ Storage bucket for PDFs
○ Triggers Cloud Functions on new uploads
Firebase Realtime Database (RTDB)
● Purpose: Real-time data storage and synchronization

 ● Implementation:
○ Stores processed journalist data
Structure:
{
"daily_scores": {
"YYYY-MM-DD": { "journalist_info": [
{
"id": "string",
"name": "string", "publication": "string", "metrics": {
"front_page": number, "exclusive": number, "standard": number
},
"daily_points": number }]}}}
Firebase Cloud Functions
● Purpose: Serverless processing of PDFs ● Implementation:
○ Triggers on new PDF uploads
○ Handles Claude AI integration
○ Processes extracted data
○ Updates RTDB with results
2. Google Workspace Google Sheets
● Purpose: Data management and calculations
● Sheets Structure:
1. Daily Entries Sheet
■ Columns: Date, ID, Name, Publication, Front Page, Exclusive,
Standard, Daily Points
■ Primary data storage
■ Auto-calculates daily points
2. Master Sheet
■ Columns: ID, Name, Overall Points

 ■ Tracks total journalist performance
■ Updates automatically based on Daily Entries
3. Configuration Sheet
■ Stores point values for different article types
■ Configurable without code changes
4. New Data Sheet
■ Temporary storage for processed PDF data
■ Same structure as Daily Entries
■ Bridge between PDF processing and main system
Google Apps Script
● Purpose: Automation and business logic
● Key Features:
○ Sheet data management
○ Point calculations
○ ID generation
○ Data validation
○ Firebase synchronization
3. Frontend Technologies React.js
● Purpose: User interface development ● Implementation:
○ Leaderboard display
○ Real-time data updates
○ Responsive design
Tailwind CSS
● Purpose: Styling and responsiveness ● Implementation:
○ Utility-first CSS
○ Responsive design
○ Custom styling

 4. LLM Integration Claude AI API (Anthropic)
● Purpose: PDF text extraction and processing
● Implementation:
○ Extracts journalist information
○ Identifies article types
○ Processes text content
○ Structures data for system
● Cost:
○ $0.008 / image
○ 1000 images = $8
System Design & Features
Automated Synchronization
● Timing: Daily at 9 AM
● Process:
○ Automated trigger activates syncToFirebase function
○ Ensures RTDB has latest data from sheets
○ Frontend automatically reflects updates
● Benefits:
○ Consistent daily updates
○ No manual intervention needed
○ Reliable data synchronization
Frontend Leaderboard Display
Capabilities:
● Real-time data updates
● 30-day rolling window
● Top 5 journalists display
Key Interactions
1. New Data → Daily Entries
● Automatic data transfer
● Triggers point calculations
● Maintains data integrity

 2. Daily Entries → Master Sheet
● Updates overall points
● Maintains journalist records
● Automatic synchronization
3. Configuration → Daily Entries
● Provides point values
● Enables dynamic calculations
● Allows system customization
Google Sheets Structure
1. Daily Entries Sheet
Purpose: Primary data repository for daily journalist activities
Structure:
 Features:
● Automatic point calculations
● Real-time updates
● Historical record keeping
● Source of truth for daily activities

 2. Master Sheet
Purpose: Tracks overall journalist performance and total points Structure:
Features:
● Automatically updates from Daily Entries
● Maintains running totals
● Quick reference for total performance
● No manual entry required
3. New Data Sheet
Purpose: Temporary storage for processed PDF data
Structure: (Same as Daily Entries except Daily Points) Features:
● Bridge between PDF processing and main system
● Temporary storage
● Auto-copies to Daily Entries
● Data validation stage
4. Configuration Sheet
Purpose: Stores system settings and point values Structure:
 
 Point Type Value Front Page 10 Exclusive 8 Standard 5
Features:
● Configurable point values
● System settings
● Easy modification without code changes
● Reference for calculations
Google Sheets Data Flow
 
 
