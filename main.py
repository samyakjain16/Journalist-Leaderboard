from collections import defaultdict
import json
import firebase_admin
from firebase_admin import initialize_app, storage, db
from firebase_functions import storage_fn, options
from datetime import datetime
import base64
import anthropic
from anthropic import Anthropic
import tempfile
import os
import time
import logging
import pdfplumber
from PIL import Image, ImageDraw
from prompts import prompt1
from firebase_admin import credentials, db
from google.oauth2 import service_account
from googleapiclient.discovery import build
# from points_calculator import PointsCalculator
from datetime import timezone
import random
import string
# from config import SERVICE_ACCOUNT_INFO
# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase
options.set_global_options(region="us-west1")
app = initialize_app()


class JournalistExtractor:
    def __init__(self):
        self.client = anthropic.Anthropic(
            # defaults to os.environ.get("ANTHROPIC_API_KEY")
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        self.journalist_stats = defaultdict(
            lambda: {'exclusive': 0, 'standard': 0})

    def convert_pdf_to_images(self, temp_pdf_path):
        """Convert PDF pages to images using pdfplumber and PIL"""
        try:
            images = []
            with pdfplumber.open(temp_pdf_path) as pdf:
                for page in pdf.pages:
                    # Convert page to image
                    img = page.to_image()
                    # Convert to PIL Image
                    pil_image = img.original
                    images.append(pil_image)

            logger.info(f"Successfully converted PDF to {len(images)} images")
            return images

        except Exception as e:
            logger.error(f"Error converting PDF to images: {str(e)}")
            raise

    def encode_image_to_base64(self, image):
        print("Encoding")
        """Convert PIL Image to base64"""
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
            image.save(tmp_file, format='PNG')
            tmp_file_path = tmp_file.name

        with open(tmp_file_path, 'rb') as image_file:
            encoded_string = base64.b64encode(
                image_file.read()).decode('utf-8')

        os.remove(tmp_file_path)
        return encoded_string

    def analyze_image_with_claude(self, image, page_num):
        """Send image to Claude for analysis"""
        base64_image = self.encode_image_to_base64(image)
        print("Done encoding image ")

        try:
            print(f"Sending request to Claude for page {page_num}")
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": base64_image
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt1
                            }
                        ]
                    }
                ]
            )

            # Extract text content from Claude's response
            if isinstance(response.content, list):
                response_text = response.content[0].text
            else:
                response_text = response.content

            # Parse JSON from the text
            try:
                page_stats = json.loads(response_text)

                # Skip if no journalists found
                if not page_stats.get('journalist_stats'):
                    logger.info(f"No journalists found on page {page_num}")
                    return None

                logger.info(
                    f"Found journalists on page {page_num}: {page_stats['journalist_stats'].keys()}")
                return page_stats

            except json.JSONDecodeError as e:
                logger.error(
                    f"Error parsing JSON from Claude response on page {page_num}: {str(e)}")
                logger.error(f"Raw response text: {response_text}")
                return None

        except Exception as e:
            logger.error(
                f"Error analyzing page {page_num} with Claude: {str(e)}")
            return None

    def process_pdf(self, temp_pdf_path):
        images = self.convert_pdf_to_images(temp_pdf_path)
        combined_stats = defaultdict(lambda: {
            'exclusive': 0,
            'standard': 0,
            'pages': []
        })

        for i, image in enumerate(images, 1):
            try:
                logger.info(f"Processing page {i}")
                page_stats = self.analyze_image_with_claude(image, i)
                print("Claude Response for page", i, ":", page_stats)

                # Skip if no journalists found or error occurred
                if not page_stats:
                    continue

                # Combine statistics and track pages
                for journalist, stats in page_stats['journalist_stats'].items():
                    combined_stats[journalist]['exclusive'] += stats.get(
                        'exclusive', 0)
                    combined_stats[journalist]['standard'] += stats.get(
                        'standard', 0)
                    if i not in combined_stats[journalist]['pages']:
                        combined_stats[journalist]['pages'].append(i)

            except Exception as e:
                logger.error(f"Error processing page {i}: {str(e)}")
                continue

        # Create final output structure
        output = {
            'journalist_stats': dict(combined_stats)
        }
        print("Final output", output)

        return output


@storage_fn.on_object_finalized()
def process_pdf_trigger(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]) -> None:
    logger.info('🔥 Function triggered - Starting extraction')

    file_path = event.data.name
    bucket_name = event.data.bucket

    if not file_path.lower().endswith('.pdf'):
        logger.info(f"Skipping non-PDF file: {file_path}")
        return

    try:
        start_time = datetime.now()

        # Get file from storage
        bucket = storage.bucket(bucket_name)
        blob = bucket.blob(file_path)

        # Download to temporary file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
            blob.download_to_filename(temp_pdf.name)
            temp_pdf_path = temp_pdf.name

        # Process PDF
        extractor = JournalistExtractor()
        results = extractor.process_pdf(temp_pdf_path)
        print("RESULTS", results)

        # Clean up temp file
        os.remove(temp_pdf_path)

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()

        # Prepare output
        output = {
            'status': 'processed',
            'processedAt': datetime.now().isoformat(),
            'fileName': file_path,
            'fileSize': blob.size,
            'uploadedAt': blob.time_created.isoformat() if blob.time_created else datetime.now().isoformat(),
            'processing_details': {
                'processingTime': str(processing_time),
                # 'pagesProcessed': len(results['page_results'])
            },
            'results': results
        }

        # Store results in journalist-pdf-processing database
        ref = db.reference(
            '/', url='https://journalist-pdf-processing.asia-southeast1.firebasedatabase.app')
        timestamp = datetime.now().strftime('%Y-%m-%d')
        clean_filename = file_path.split('/')[-1].replace('.', '_')
        ref_key = f"{timestamp}_{clean_filename}"

        new_ref = ref.child('processed_pdfs').child(ref_key)
        new_ref.set(output)

        logger.info(f"✅ Processing complete for: {file_path}")
        logger.info(f"Result stored with key: {ref_key}")

        sheets_sync_result = sync_to_sheets(results, file_path, timestamp)
        if sheets_sync_result:
            output['sheets_sync'] = {
                'status': 'success',
                'timestamp': datetime.now().isoformat()
            }
        else:
            output['sheets_sync'] = {
                'status': 'failed',
                'timestamp': datetime.now().isoformat()
            }

    except Exception as e:
        error_msg = f"❌ Error processing PDF {file_path}: {str(e)}"
        logger.error(error_msg)

        # Store error
        ref = db.reference(
            '/', url='https://journalist-pdf-processing.asia-southeast1.firebasedatabase.app')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        error_key = f"error_{timestamp}"

        error_data = {
            'fileName': file_path,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        ref.child('processing_errors').child(error_key).set(error_data)
        raise e


def format_date(date_string):
    """
    Format ISO date string to YYYY-MM-DD
    Input example: 2024-11-07T06:37:53.659912+00:00
    Output: 2024-11-07
    """
    # Split at T and take the first part (YYYY-MM-DD)
    return date_string.split('T')[0]


def sync_to_sheets(results, file_path, timestamp):
    """Sync PDF processing results to Google Sheets with enhanced error handling and validation"""
    try:
        print("Syncying")
        # Your Google Sheets API credentials and setup
        SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
        SERVICE_ACCOUNT_FILE = "/workspace/journalist-leaderboard-c4b7b2f551fa.json"

        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)

        service = build('sheets', 'v4', credentials=credentials)

        # Validate results structure before sending
        if not validate_results_structure(results):
            raise ValueError("Invalid results structure")

        print("Timestamp", timestamp)
        # Get the uploaded date from results and format it
        formatted_date = timestamp.split(
            'T')[0] if 'T' in timestamp else timestamp

        sync_data = {
            'uploadedAt': formatted_date,
            'fileName': os.path.basename(file_path),
            'results': {
                'journalist_stats': results.get('journalist_stats', {}),
                'metadata': {
                    'processingTime': datetime.now(timezone.utc).timestamp(),
                    'sourceFile': os.path.basename(file_path)
                }
            }
        }

        SPREADSHEET_ID = '1dzgtLyNbbdUDa2OPE9PR1R8ZYKqyQWvhuSB2-NpIock'

        # Prepare data for the sheets
        values = []
        for name, stats in results['journalist_stats'].items():
            print("ts", timestamp)
            row = [
                timestamp,  # Date
                ''.join(random.choices(string.ascii_uppercase + \
                        string.digits, k=5)),  # Generate a random ID
                name,  # Journalist name
                'AFR',  # Publication
                0,  # Front Page (default to 0)
                stats.get('exclusive', 0),  # Exclusive count
                stats.get('standard', 0),  # Standard count
                0  # Daily Points (will be calculated by sheet formula)
            ]
            values.append(row)

        # Call Google Sheets API with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = service.spreadsheets().values().append(
                    spreadsheetId=SPREADSHEET_ID,
                    range="New Data!A2",  # Append to New Data sheet starting from A2
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={'values': values}
                ).execute()

                print("added to google sheets")
                logger.info(
                    f"Successfully synced data to Google Sheets: {result}")
                return True

            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(
                    f"Retry {attempt + 1}/{max_retries} failed: {str(e)}")
                time.sleep(2 ** attempt)  # Exponential backoff

    except Exception as e:
        print("Error occured", str(e))
        logger.error(f"Error syncing to Google Sheets: {str(e)}")
        return False


def validate_results_structure(results):
    """Validate the results structure matches what Apps Script expects"""
    if not isinstance(results, dict):
        return False

    if 'journalist_stats' not in results:
        return False

    journalist_stats = results['journalist_stats']
    if not isinstance(journalist_stats, dict):
        return False

    # Validate each journalist's stats
    for name, stats in journalist_stats.items():
        if not isinstance(stats, dict):
            return False
        if not all(isinstance(stats.get(key, 0), (int, float))
                   for key in ['exclusive', 'standard']):
            return False

    return True
