import json
from datetime import datetime
from typing import List, Dict, Optional, Any, Union

class MemStorage:
    """In-memory storage implementation for Flask backend"""
    
    def __init__(self):
        self.users = {}
        self.projects = {}
        self.brand_concepts = {}
        self.user_id_counter = 1
        self.project_id_counter = 1
        self.concept_id_counter = 1
        
        # Initialize with demo user
        self.create_user({
            "username": "demo",
            "password": "demo123"
        })
        
        # Add sample projects for testing
        project1 = {
            "id": 1,
            "name": "Solystra",
            "clientName": "Sample Client",
            "userId": 1,
            "createdAt": datetime.now().isoformat()
        }
        self.projects[project1["id"]] = project1
        
        project2 = {
            "id": 2,
            "name": "NexGen Fintech",
            "clientName": "Financial Innovations Inc.",
            "userId": 1,
            "createdAt": datetime.now().isoformat()
        }
        self.projects[project2["id"]] = project2
        self.project_id_counter = 3
        
        # Add sample brand concepts for testing
        self.create_brand_concept({
            "projectId": project1["id"],
            "name": "Initial Concept",
            "isActive": True,
            "brandInputs": {
                "brandName": "Solystra",
                "industry": "Renewable Energy",
                "description": "A cutting-edge renewable energy company focused on solar solutions",
                "values": [
                    {"id": "1", "value": "Sustainability"},
                    {"id": "2", "value": "Innovation"},
                    {"id": "3", "value": "Reliability"}
                ],
                "designStyle": "modern",
                "colorPreferences": ["blue", "orange", "white"]
            },
            "brandOutput": {
                "logo": {
                    "primary": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#1E40AF"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#F97316"/><circle cx="100" cy="100" r="30" fill="#FFFFFF"/></svg>',
                    "monochrome": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#333333"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#666666"/><circle cx="100" cy="100" r="30" fill="#FFFFFF"/></svg>',
                    "reverse": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#FFFFFF"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#FFFFFF"/><circle cx="100" cy="100" r="30" fill="#1E40AF"/></svg>'
                },
                "colors": [
                    {"name": "Primary Blue", "hex": "#1E40AF", "type": "primary"},
                    {"name": "Energy Orange", "hex": "#F97316", "type": "secondary"},
                    {"name": "Pure White", "hex": "#FFFFFF", "type": "accent"},
                    {"name": "Deep Navy", "hex": "#0F172A", "type": "base"}
                ],
                "typography": {
                    "headings": "Montserrat",
                    "body": "Open Sans"
                },
                "logoDescription": "A modern and bold logo representing solar energy and innovation",
                "tagline": "Powering Tomorrow's World",
                "contactName": "Alex Rivera",
                "contactTitle": "Chief Innovation Officer",
                "contactPhone": "+1 (415) 555-8729",
                "address": "123 Solar Way, San Francisco, CA 94110",
                "mockups": []
            }
        })
        
        # Add a concept for the second project
        self.create_brand_concept({
            "projectId": project2["id"],
            "name": "Financial Tech Concept",
            "isActive": True,
            "brandInputs": {
                "brandName": "NexGen Fintech",
                "industry": "Financial Technology",
                "description": "A revolutionary fintech platform that simplifies banking and investments",
                "values": [
                    {"id": "1", "value": "Security"},
                    {"id": "2", "value": "Innovation"},
                    {"id": "3", "value": "Accessibility"},
                    {"id": "4", "value": "Transparency"}
                ],
                "designStyle": "minimalist",
                "colorPreferences": ["navy", "gold", "teal"]
            },
            "brandOutput": {
                "logo": {
                    "primary": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect x="40" y="40" width="120" height="120" fill="#0A2342" rx="10" ry="10"/><path d="M75 80L100 60L125 80L125 120L75 120L75 80Z" fill="#E8C547"/><path d="M85 100L115 100" stroke="#20A39E" stroke-width="6" stroke-linecap="round"/><path d="M85 110L105 110" stroke="#20A39E" stroke-width="6" stroke-linecap="round"/></svg>',
                    "monochrome": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><filter id="grayscale"><feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"/></filter><rect x="40" y="40" width="120" height="120" fill="#333333" rx="10" ry="10"/><path d="M75 80L100 60L125 80L125 120L75 120L75 80Z" fill="#666666"/><path d="M85 100L115 100" stroke="#999999" stroke-width="6" stroke-linecap="round"/><path d="M85 110L105 110" stroke="#999999" stroke-width="6" stroke-linecap="round"/></svg>',
                    "reverse": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="#111111"/><rect x="40" y="40" width="120" height="120" fill="#FFFFFF" rx="10" ry="10"/><path d="M75 80L100 60L125 80L125 120L75 120L75 80Z" fill="#111111"/><path d="M85 100L115 100" stroke="#444444" stroke-width="6" stroke-linecap="round"/><path d="M85 110L105 110" stroke="#444444" stroke-width="6" stroke-linecap="round"/></svg>'
                },
                "colors": [
                    {"name": "Navy Blue", "hex": "#0A2342", "type": "primary"},
                    {"name": "Gold", "hex": "#E8C547", "type": "secondary"},
                    {"name": "Teal", "hex": "#20A39E", "type": "accent"},
                    {"name": "Charcoal", "hex": "#222222", "type": "base"}
                ],
                "typography": {
                    "headings": "Poppins",
                    "body": "Roboto"
                },
                "logoDescription": "A minimalist logo representing security and financial growth",
                "tagline": "Banking for the Digital Age",
                "contactName": "Jordan Chen",
                "contactTitle": "Director of Client Relations",
                "contactPhone": "+1 (415) 555-2390",
                "address": "485 Financial District Ave, San Francisco, CA 94104",
                "mockups": []
            }
        })
    
    # User operations
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
        id = self.user_id_counter
        self.user_id_counter += 1
        user = {**user_data, "id": id}
        self.users[id] = user
        return user
    
    # Project operations
    def get_projects(self, user_id: int) -> List[Dict]:
        """Get projects for a user"""
        return [
            project for project in self.projects.values()
            if project["userId"] == user_id
        ]
    
    def get_project(self, id: int) -> Optional[Dict]:
        """Get project by ID"""
        return self.projects.get(id)
    
    def create_project(self, project_data: Dict) -> Dict:
        """Create a new project"""
        id = self.project_id_counter
        self.project_id_counter += 1
        now = datetime.now().isoformat()
        
        # Ensure clientName is not None
        if "clientName" not in project_data:
            project_data["clientName"] = None
            
        project = {
            **project_data,
            "id": id,
            "createdAt": now
        }
        self.projects[id] = project
        return project
    
    def update_project(self, id: int, partial_project: Dict) -> Optional[Dict]:
        """Update an existing project"""
        project = self.projects.get(id)
        if not project:
            return None
        
        updated_project = {**project, **partial_project}
        self.projects[id] = updated_project
        return updated_project
    
    def delete_project(self, id: int) -> bool:
        """Delete a project and its concepts"""
        # Delete all brand concepts associated with this project
        concepts_to_delete = [
            concept_id for concept_id, concept in self.brand_concepts.items()
            if concept["projectId"] == id
        ]
        
        for concept_id in concepts_to_delete:
            del self.brand_concepts[concept_id]
        
        # Delete the project
        if id in self.projects:
            del self.projects[id]
            return True
        return False
    
    # Brand concept operations
    def get_brand_concepts(self, project_id: int) -> List[Dict]:
        """Get all brand concepts for a project"""
        return [
            concept for concept in self.brand_concepts.values()
            if concept["projectId"] == project_id
        ]
    
    def get_brand_concept(self, id: int) -> Optional[Dict]:
        """Get brand concept by ID"""
        return self.brand_concepts.get(id)
    
    def create_brand_concept(self, concept_data: Dict) -> Dict:
        """Create a new brand concept"""
        id = self.concept_id_counter
        self.concept_id_counter += 1
        now = datetime.now().isoformat()
        
        # Ensure isActive is not None
        if "isActive" not in concept_data:
            concept_data["isActive"] = False
            
        concept = {
            **concept_data,
            "id": id,
            "createdAt": now
        }
        self.brand_concepts[id] = concept
        
        # If this concept is set as active, deactivate all other concepts for this project
        if concept["isActive"]:
            self.set_active_brand_concept(id, concept["projectId"])
        
        return concept
    
    def update_brand_concept(self, id: int, partial_concept: Dict) -> Optional[Dict]:
        """Update an existing brand concept"""
        concept = self.brand_concepts.get(id)
        if not concept:
            return None
        
        updated_concept = {**concept, **partial_concept}
        self.brand_concepts[id] = updated_concept
        
        # If this concept is being set as active, deactivate all others
        if partial_concept.get("isActive") and updated_concept["isActive"]:
            self.set_active_brand_concept(id, concept["projectId"])
        
        return updated_concept
    
    def delete_brand_concept(self, id: int) -> bool:
        """Delete a brand concept"""
        if id in self.brand_concepts:
            del self.brand_concepts[id]
            return True
        return False
    
    def set_active_brand_concept(self, id: int, project_id: int) -> bool:
        """Set a brand concept as active and deactivate others for the same project"""
        try:
            # Deactivate all concepts for this project
            for concept_id, concept in self.brand_concepts.items():
                if concept["projectId"] == project_id and concept_id != id:
                    concept["isActive"] = False
            
            # Activate the specified concept
            concept = self.brand_concepts.get(id)
            if concept:
                concept["isActive"] = True
            
            return True
        except Exception as e:
            print(f"Error setting active brand concept: {e}")
            return False