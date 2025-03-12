"""Storage implementations for the application"""
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

class MemStorage:
    """In-memory storage implementation for Flask backend"""
    
    def __init__(self):
        """Initialize the storage with empty collections"""
        self.users = {}  # user_id -> user data
        self.projects = {}  # project_id -> project data
        self.brand_concepts = {}  # concept_id -> concept data
        
        self.user_id_counter = 1
        self.project_id_counter = 1
        self.concept_id_counter = 1
        
        # Create a default user for demo purposes
        self.create_user({
            "username": "demo",
            "password": "password"  # In a real app, this would be hashed
        })
        
        # Add a sample project
        self.create_project({
            "name": "Solystra",
            "clientName": "Sample Client",
            "userId": 1
        })

    def get_user(self, id: int) -> Optional[Dict]:
        """Get user by ID"""
        return self.users.get(id)
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        for user in self.users.values():
            if user["username"] == username:
                return user
        return None
    
    def create_user(self, user_data: Dict) -> Dict:
        """Create a new user"""
        user_id = self.user_id_counter
        self.user_id_counter += 1
        
        user = {
            "id": user_id,
            **user_data
        }
        
        self.users[user_id] = user
        return user
    
    def get_projects(self, user_id: int) -> List[Dict]:
        """Get projects for a user"""
        return [p for p in self.projects.values() if p["userId"] == user_id]
    
    def get_project(self, id: int) -> Optional[Dict]:
        """Get project by ID"""
        return self.projects.get(id)
    
    def create_project(self, project_data: Dict) -> Dict:
        """Create a new project"""
        project_id = self.project_id_counter
        self.project_id_counter += 1
        
        project = {
            "id": project_id,
            "createdAt": datetime.now().isoformat(),
            **project_data
        }
        
        self.projects[project_id] = project
        return project
    
    def update_project(self, id: int, partial_project: Dict) -> Optional[Dict]:
        """Update an existing project"""
        project = self.get_project(id)
        if not project:
            return None
        
        updated_project = {**project, **partial_project}
        self.projects[id] = updated_project
        return updated_project
    
    def delete_project(self, id: int) -> bool:
        """Delete a project and its concepts"""
        if id not in self.projects:
            return False
        
        # Delete all brand concepts for this project
        concept_ids_to_delete = []
        for concept_id, concept in self.brand_concepts.items():
            if concept["projectId"] == id:
                concept_ids_to_delete.append(concept_id)
        
        for concept_id in concept_ids_to_delete:
            del self.brand_concepts[concept_id]
        
        # Delete the project
        del self.projects[id]
        return True
    
    def get_brand_concepts(self, project_id: int) -> List[Dict]:
        """Get all brand concepts for a project"""
        return [c for c in self.brand_concepts.values() if c["projectId"] == project_id]
    
    def get_brand_concept(self, id: int) -> Optional[Dict]:
        """Get brand concept by ID"""
        return self.brand_concepts.get(id)
    
    def create_brand_concept(self, concept_data: Dict) -> Dict:
        """Create a new brand concept"""
        concept_id = self.concept_id_counter
        self.concept_id_counter += 1
        
        # Set isActive to False by default
        if "isActive" not in concept_data:
            concept_data["isActive"] = False
        
        concept = {
            "id": concept_id,
            "createdAt": datetime.now().isoformat(),
            **concept_data
        }
        
        self.brand_concepts[concept_id] = concept
        
        # If this is the first concept for the project, make it active
        project_concepts = self.get_brand_concepts(concept["projectId"])
        if len(project_concepts) == 1:
            concept["isActive"] = True
            self.brand_concepts[concept_id] = concept
        
        return concept
    
    def update_brand_concept(self, id: int, partial_concept: Dict) -> Optional[Dict]:
        """Update an existing brand concept"""
        concept = self.get_brand_concept(id)
        if not concept:
            return None
        
        updated_concept = {**concept, **partial_concept}
        self.brand_concepts[id] = updated_concept
        return updated_concept
    
    def delete_brand_concept(self, id: int) -> bool:
        """Delete a brand concept"""
        if id not in self.brand_concepts:
            return False
        
        # Get the concept to check if it's active
        concept = self.brand_concepts[id]
        project_id = concept["projectId"]
        was_active = concept["isActive"]
        
        # Delete the concept
        del self.brand_concepts[id]
        
        # If the deleted concept was active, set another concept as active (if any remain)
        if was_active:
            project_concepts = self.get_brand_concepts(project_id)
            if project_concepts:
                # Set the first available concept as active
                first_concept_id = project_concepts[0]["id"]
                self.set_active_brand_concept(first_concept_id, project_id)
        
        return True
    
    def set_active_brand_concept(self, id: int, project_id: int) -> bool:
        """Set a brand concept as active and deactivate others for the same project"""
        # Check if the concept exists
        concept = self.get_brand_concept(id)
        if not concept:
            return False
        
        # Deactivate all concepts for this project
        for c_id, c in self.brand_concepts.items():
            if c["projectId"] == project_id:
                c["isActive"] = False
                self.brand_concepts[c_id] = c
        
        # Activate the specified concept
        concept["isActive"] = True
        self.brand_concepts[id] = concept
        
        return True