import os
from dotenv import load_dotenv
from datetime import date
from paperswithcode import PapersWithCodeClient
from flask import Flask, jsonify, request

load_dotenv()

app = Flask(__name__)
client = PapersWithCodeClient()

def safe_date_conversion(value):
    return value.strftime("%#d %B %Y") if isinstance(value, date) else value

def safe_get(item, key, default=""):
    if isinstance(item, dict):
        return item.get(key, default) or default
    else:
        return getattr(item, key, default) or default

def convert_paperrepo_to_json(paperrepo):
    if isinstance(paperrepo, dict):
        paper = paperrepo.get("paper", {})
        repo = paperrepo.get("repository", None)
    else:
        paper = getattr(paperrepo, "paper", {})
        repo = getattr(paperrepo, "repository", None)
    paper_json = {
        "id": safe_get(paper, "id", "N/A"),
        "arxiv_id": safe_get(paper, "arxiv_id", "N/A"),
        "url_pdf": safe_get(paper, "url_pdf", ""),
        "title": safe_get(paper, "title", "Untitled"),
        "abstract": safe_get(paper, "abstract", ""),
        "authors": safe_get(paper, "authors", []),
        "published": safe_date_conversion(safe_get(paper, "published", ""))
    }
    if repo is None:
        repo_json = None
    else:
        repo_json = {
            "url": safe_get(repo, "url", ""),
            "owner": safe_get(repo, "owner", ""),
            "name": safe_get(repo, "name", ""),
            "stars": safe_get(repo, "stars", 0),
            "framework": safe_get(repo, "framework", "")
        }
    return {
        "paper": paper_json,
        "repository": repo_json
    }
 
@app.route('/trending_papers', methods=['GET'])
def get_trending_papers():
    try:
        page = int(request.args.get('page', 1))
        items = int(request.args.get('items', 10))
        max_attempts = 5 
        for attempt in range(max_attempts):
            try:
                response = client.search(items_per_page=items, page=page)
                results = [convert_paperrepo_to_json(p) for p in response.results]
                return jsonify({"results": results, "next_page": response.next_page})
            except Exception as e:
                print(f"Attempt {attempt + 1} failed for page {page}: {e}")
                page += 1
        return jsonify({"error": f"Failed to fetch trending papers after {max_attempts} attempts"}), 500
    except Exception as e:
        print("Error in trending_papers endpoint:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/search_papers', methods=['GET'])
def get_relevant_papers():
    try:
        query = request.args.get('query', '')
        page = int(request.args.get('page', 1))
        items = int(request.args.get('items', 10))
        response = client.search(q=query, page=page, items_per_page=items)
        results = [convert_paperrepo_to_json(p) for p in response.results]
        return jsonify({"results": results, "next_page": response.next_page})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    host = os.getenv("PWC_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("PWC_PORT", "8080")))
    app.run(host=host, port=port)