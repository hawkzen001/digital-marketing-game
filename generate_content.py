import os
import json
import time

try:
    import google.generativeai as genai
except ImportError:
    print("Please install the Google Generative AI SDK first:")
    print("pip install google-generativeai")
    exit(1)

# ==========================================
# CONFIGURATION
# ==========================================
# Get your Gemini API key from Google AI Studio (https://aistudio.google.com/app/apikey)
# Set it as an environment variable or paste it directly below (not recommended for public repos)
API_KEY = os.environ.get("GEMINI_API_KEY", "AQ.Ab8RN6Lat2G5hyK6yAYCA_i9rozYtVvUqVwjQq6Uzpu1b6VCJA") 

# Configure the SDK
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Define the modules you want to generate content for
MODULES = ["intro", "seo", "sem", "smm", "content", "email"]
ACTIVITIES_PER_MODULE = 100 
QUIZZES_COUNT = 50
SIMULATIONS_COUNT = 25
AI_FREE_TEXT_COUNT = 25

def generate_quizzes(module_id, count):
    prompt = f"""
    You are an expert digital marketing instructor. Generate {count} multiple choice quiz questions for the {module_id} module.
    Format your response EXACTLY as a JSON array of objects. Do not use markdown blocks.
    Structure:
    [{{
        "text": "Question text?",
        "options": ["Option 1", "Option A", "Option B"],
        "correctIndex": 1,
        "explanation": "Why Option A is correct."
    }}]
    """
    response = model.generate_content(prompt)
    try:
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"Error parsing JSON for {module_id} quizzes: {e}")
        return []

def generate_ai_prompts(module_id, count):
    prompt = f"""
    You are an expert digital marketing instructor. Generate {count} creative free-text challenges for the {module_id} module.
    The student will type an open-ended answer to these prompts.
    Format your response EXACTLY as a JSON array of objects. Do not use markdown blocks.
    Structure:
    [{{
        "title": "Short title of challenge",
        "description": "1 sentence description",
        "prompt": "Detailed scenario prompt for the student..."
    }}]
    """
    response = model.generate_content(prompt)
    try:
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"Error parsing JSON for {module_id} AI prompts: {e}")
        return []

def main():
    if API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        print("ERROR: You must set your Gemini API key in the script before running it!")
        return

    all_activities = []
    
    print("Starting Bulk Content Generation (This may take a while...)")
    
    for module in MODULES:
        print(f"\n--- Generating content for {module} ---")
        
        # 1. Generate Quizzes
        print(f"Generating {QUIZZES_COUNT} quizzes...")
        # Note: We batch this into smaller chunks (e.g. 10 at a time) to avoid API token limits
        for i in range(QUIZZES_COUNT // 10):
            quizzes = generate_quizzes(module, 10)
            if quizzes:
                all_activities.append({
                    "id": f"{module}_quiz_batch_{i}",
                    "coreModuleId": module,
                    "type": "quiz",
                    "title": f"Advanced {module.upper()} Quiz {i+1}",
                    "description": "Test your deep knowledge.",
                    "pointsReward": 500,
                    "questions": quizzes
                })
            time.sleep(2) # Avoid rate limits
            
        # 2. Generate AI Free Text Prompts
        print(f"Generating {AI_FREE_TEXT_COUNT} AI challenges...")
        for i in range(AI_FREE_TEXT_COUNT // 5):
            challenges = generate_ai_prompts(module, 5)
            for j, challenge in enumerate(challenges):
                all_activities.append({
                    "id": f"{module}_ai_challenge_{i}_{j}",
                    "coreModuleId": module,
                    "type": "ai_free_text",
                    "title": challenge.get("title", "AI Challenge"),
                    "description": challenge.get("description", "Complete the challenge."),
                    "prompt": challenge.get("prompt", "Prompt text missing"),
                    "pointsReward": 1000
                })
            time.sleep(2)
            
    # Save everything to JSON
    output_file = "generated_content.json"
    with open(output_file, 'w') as f:
        json.dump(all_activities, f, indent=4)
        
    print(f"\n✅ Successfully generated {len(all_activities)} activity groupings!")
    print(f"Saved to {output_file}. You can now load this JSON into your platform or Firebase Firestore.")

if __name__ == "__main__":
    main()
