"""Test script for Flask API endpoints"""
import requests
import json
import logging
import argparse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_health_check(base_url):
    """Test the health check endpoint"""
    url = f"{base_url}/api/health"
    logger.info(f"Testing health check endpoint: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        logger.info(f"Health check response: {response.status_code} {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Health check failed: {e}")
        return False

def test_get_projects(base_url):
    """Test the get projects endpoint"""
    url = f"{base_url}/api/projects"
    logger.info(f"Testing get projects endpoint: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        projects = response.json()
        logger.info(f"Got {len(projects)} projects")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Get projects failed: {e}")
        return False

def test_create_project(base_url):
    """Test the create project endpoint"""
    url = f"{base_url}/api/projects"
    test_project = {
        "name": "Test Project",
        "clientName": "Test Client",
        "userId": 1
    }
    logger.info(f"Testing create project endpoint: {url}")
    try:
        response = requests.post(url, json=test_project)
        response.raise_for_status()
        project = response.json()
        logger.info(f"Created project: {project}")
        return project["id"]
    except requests.exceptions.RequestException as e:
        logger.error(f"Create project failed: {e}")
        return None

def test_get_project(base_url, project_id):
    """Test the get project endpoint"""
    url = f"{base_url}/api/projects/{project_id}"
    logger.info(f"Testing get project endpoint: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        project = response.json()
        logger.info(f"Got project: {project}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Get project failed: {e}")
        return False

def test_delete_project(base_url, project_id):
    """Test the delete project endpoint"""
    url = f"{base_url}/api/projects/{project_id}"
    logger.info(f"Testing delete project endpoint: {url}")
    try:
        response = requests.delete(url)
        response.raise_for_status()
        logger.info(f"Deleted project with status code: {response.status_code}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Delete project failed: {e}")
        return False

def test_generate_concept(base_url):
    """Test the generate concept endpoint"""
    url = f"{base_url}/api/test-claude"
    test_input = {
        "brandName": "TestBrand",
        "industry": "Technology",
        "description": "A modern tech company",
        "values": [{"id": "1", "value": "Innovation"}, {"id": "2", "value": "Quality"}],
        "designStyle": "modern",
        "colorPreferences": ["blue", "green"]
    }
    logger.info(f"Testing generate concept endpoint: {url}")
    try:
        response = requests.post(url, json=test_input)
        response.raise_for_status()
        result = response.json()
        logger.info(f"Generated concept: {json.dumps(result)[:200]}...")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Generate concept failed: {e}")
        return False

def test_replicate(base_url):
    """Test the Replicate API endpoint"""
    url = f"{base_url}/api/test-replicate"
    logger.info(f"Testing Replicate API endpoint: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        result = response.json()
        logger.info(f"Replicate test result: {json.dumps(result)[:200]}...")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Replicate test failed: {e}")
        return False

def run_tests(base_url):
    """Run all tests"""
    logger.info(f"Running tests against Flask API at {base_url}")
    
    # Test health check
    if not test_health_check(base_url):
        logger.error("Health check test failed, aborting remaining tests")
        return False
    
    # Test get projects
    if not test_get_projects(base_url):
        logger.error("Get projects test failed")
    
    # Test create project
    project_id = test_create_project(base_url)
    if project_id is None:
        logger.error("Create project test failed")
    else:
        # Test get project
        if not test_get_project(base_url, project_id):
            logger.error(f"Get project test failed for project {project_id}")
        
        # Test delete project
        if not test_delete_project(base_url, project_id):
            logger.error(f"Delete project test failed for project {project_id}")
    
    # Test generate concept
    if not test_generate_concept(base_url):
        logger.error("Generate concept test failed")
    
    # Test Replicate
    if not test_replicate(base_url):
        logger.error("Replicate test failed")
    
    logger.info("All tests completed")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Flask API endpoints")
    parser.add_argument("--url", default="http://localhost:5001", help="Base URL for the Flask API")
    args = parser.parse_args()
    
    run_tests(args.url)