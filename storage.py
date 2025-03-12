"""Storage implementations for the application"""
import datetime
from typing import Dict, List, Optional, Any

class MemStorage:
    """In-memory storage implementation for Flask backend"""

    def __init__(self):
        """Initialize the storage with empty collections"""
        self.users = {}  # {id: user_dict}
        self.projects = {}  # {id: project_dict}
        self.brand_concepts = {}  # {id: concept_dict}
        
        self.user_id_counter = 1
        self.project_id_counter = 1
        self.concept_id_counter = 1
        
        # Add a test user
        self._create_test_data()
    
    def _create_test_data(self):
        """Create test data for development"""
        # Create a test user
        self.create_user({
            "username": "testuser",
            "password": "password123"
        })
        
        # Create a sample project
        project = self.create_project({
            "name": "Solystra",
            "clientName": "Sample Client",
            "userId": 1
        })
        
        # Create a sample brand concept
        self.create_brand_concept({
            "projectId": project["id"],
            "name": "Initial Concept",
            "brandInputs": {
                "brandName": "Solystra",
                "industry": "Renewable Energy",
                "description": "Solar energy solutions for modern homes",
                "values": [
                    {"id": "1", "value": "Sustainability"},
                    {"id": "2", "value": "Innovation"},
                    {"id": "3", "value": "Reliability"}
                ],
                "designStyle": "modern",
                "colorPreferences": ["blue", "green", "orange"]
            },
            "brandOutput": {
                "logo": {
                    "primary": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="#2563EB"/><circle cx="100" cy="100" r="40" fill="#F97316"/><path d="M100 20 L160 100 L100 180 L40 100 Z" fill="none" stroke="#10B981" stroke-width="4"/></svg>',
                    "monochrome": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="#000000"/><circle cx="100" cy="100" r="40" fill="#FFFFFF"/><path d="M100 20 L160 100 L100 180 L40 100 Z" fill="none" stroke="#888888" stroke-width="4"/></svg>',
                    "reverse": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="#FFFFFF"/><circle cx="100" cy="100" r="40" fill="#000000"/><path d="M100 20 L160 100 L100 180 L40 100 Z" fill="none" stroke="#CCCCCC" stroke-width="4"/></svg>'
                },
                "colors": [
                    {"name": "Solar Blue", "hex": "#2563EB", "type": "primary"},
                    {"name": "Energy Orange", "hex": "#F97316", "type": "secondary"},
                    {"name": "Eco Green", "hex": "#10B981", "type": "accent"},
                    {"name": "Cloud White", "hex": "#F8FAFC", "type": "base"},
                    {"name": "Night Blue", "hex": "#1E3A8A", "type": "base"}
                ],
                "typography": {
                    "headings": "Montserrat",
                    "body": "Open Sans"
                },
                "tagline": "Powering Tomorrow, Today",
                "logoDescription": "A modern, abstract representation of the sun (orange circle) with solar rays (blue circle) and a diamond shape representing homes and buildings (green outline)."
            },
            "isActive": True
        })

    def get_user(self, id: int) -> Optional[Dict]:
        """Get user by ID"""
        return self.users.get(id)
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        for user in self.users.values():
            if user["username"].lower() == username.lower():
                return user
        return None
    
    def create_user(self, user_data: Dict) -> Dict:
        """Create a new user"""
        id = self.user_id_counter
        self.user_id_counter += 1
        
        user = {
            "id": id,
            "username": user_data["username"],
            "password": user_data["password"]
        }
        
        self.users[id] = user
        return user
    
    def get_projects(self, user_id: int) -> List[Dict]:
        """Get projects for a user"""
        return [p for p in self.projects.values() if p["userId"] == user_id]
    
    def get_project(self, id: int) -> Optional[Dict]:
        """Get project by ID"""
        return self.projects.get(id)
    
    def create_project(self, project_data: Dict) -> Dict:
        """Create a new project"""
        id = self.project_id_counter
        self.project_id_counter += 1
        
        project = {
            "id": id,
            "name": project_data["name"],
            "clientName": project_data.get("clientName"),
            "userId": project_data["userId"],
            "createdAt": datetime.datetime.now().isoformat()
        }
        
        self.projects[id] = project
        return project
    
    def update_project(self, id: int, partial_project: Dict) -> Optional[Dict]:
        """Update an existing project"""
        project = self.projects.get(id)
        if not project:
            return None
        
        for key, value in partial_project.items():
            if key in project:
                project[key] = value
        
        return project
    
    def delete_project(self, id: int) -> bool:
        """Delete a project and its concepts"""
        if id not in self.projects:
            return False
        
        # Delete the project
        del self.projects[id]
        
        # Delete all concepts for this project
        concept_ids_to_delete = []
        for concept_id, concept in self.brand_concepts.items():
            if concept["projectId"] == id:
                concept_ids_to_delete.append(concept_id)
        
        for concept_id in concept_ids_to_delete:
            del self.brand_concepts[concept_id]
        
        return True
    
    def get_brand_concepts(self, project_id: int) -> List[Dict]:
        """Get all brand concepts for a project"""
        return [c for c in self.brand_concepts.values() if c["projectId"] == project_id]
    
    def get_brand_concept(self, id: int) -> Optional[Dict]:
        """Get brand concept by ID"""
        return self.brand_concepts.get(id)
    
    def create_brand_concept(self, concept_data: Dict) -> Dict:
        """Create a new brand concept"""
        id = self.concept_id_counter
        self.concept_id_counter += 1
        
        concept = {
            "id": id,
            "projectId": concept_data["projectId"],
            "name": concept_data["name"],
            "brandInputs": concept_data["brandInputs"],
            "brandOutput": concept_data["brandOutput"],
            "isActive": concept_data.get("isActive", False),
            "createdAt": datetime.datetime.now().isoformat()
        }
        
        self.brand_concepts[id] = concept
        
        # If this concept is active, deactivate all others
        if concept["isActive"]:
            self.set_active_brand_concept(id, concept["projectId"])
        
        return concept
    
    def update_brand_concept(self, id: int, partial_concept: Dict) -> Optional[Dict]:
        """Update an existing brand concept"""
        concept = self.brand_concepts.get(id)
        if not concept:
            return None
        
        for key, value in partial_concept.items():
            if key in concept:
                if key in ["brandInputs", "brandOutput"] and isinstance(value, dict):
                    # Merge dictionaries for nested properties
                    concept[key].update(value)
                else:
                    concept[key] = value
        
        return concept
    
    def delete_brand_concept(self, id: int) -> bool:
        """Delete a brand concept"""
        if id not in self.brand_concepts:
            return False
        
        del self.brand_concepts[id]
        return True
    
    def set_active_brand_concept(self, id: int, project_id: int) -> bool:
        """Set a brand concept as active and deactivate others for the same project"""
        # Find the concept to activate
        concept_to_activate = self.brand_concepts.get(id)
        if not concept_to_activate or concept_to_activate["projectId"] != project_id:
            return False
        
        # Deactivate all concepts for this project
        for concept in self.brand_concepts.values():
            if concept["projectId"] == project_id:
                concept["isActive"] = False
        
        # Activate the requested concept
        concept_to_activate["isActive"] = True
        return True