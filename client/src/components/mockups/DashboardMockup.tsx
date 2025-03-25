import { Plus, MoreHorizontal, Folder, Clock } from 'lucide-react';

// Dashboard mockup with projects list and analytics
export function DashboardMockup() {
  return (
    <div className="bg-card text-card-foreground w-full h-full flex flex-col overflow-hidden rounded-md border shadow-sm">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-bold">Projects</h1>
        <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
          <Plus className="mr-1 h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockProjects.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {mockActivities.map((activity, index) => (
              <div key={index} className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                <span className="flex-1">{activity.action}</span>
                <span>{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ project }: { project: any }) {
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Project Preview */}
      <div 
        className="h-32 bg-cover bg-center border-b" 
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4)), ${project.gradient}` 
        }}
      >
        <div className="flex justify-between items-start p-3">
          <div className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
            {project.concepts} concepts
          </div>
          <button className="text-white bg-black/30 backdrop-blur-sm p-1 rounded-full">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3 mt-6">
          <h3 className="text-white text-lg font-bold drop-shadow-sm">{project.name}</h3>
        </div>
      </div>
      
      {/* Project Info */}
      <div className="p-3 flex justify-between items-center bg-card">
        <div className="flex items-center text-sm text-muted-foreground">
          <Folder className="h-4 w-4 mr-1" />
          <span>{project.clientName}</span>
        </div>
        <span className="text-xs text-muted-foreground">{project.updatedAt}</span>
      </div>
    </div>
  );
}

// Mock data
const mockProjects = [
  {
    name: "Quantum Coffee",
    clientName: "Quantum Foods Inc.",
    concepts: 3,
    updatedAt: "2 days ago",
    gradient: "linear-gradient(to right, #3B82F6, #8B5CF6)"
  },
  {
    name: "EcoMove",
    clientName: "Green Transport LLC",
    concepts: 2,
    updatedAt: "5 days ago",
    gradient: "linear-gradient(to right, #10B981, #3B82F6)"
  },
  {
    name: "NovaTech Solutions",
    clientName: "Nova Enterprises",
    concepts: 4,
    updatedAt: "1 week ago",
    gradient: "linear-gradient(to right, #F97316, #EC4899)"
  },
  {
    name: "Zenith Financial",
    clientName: "Zenith Banking Group",
    concepts: 1,
    updatedAt: "2 weeks ago",
    gradient: "linear-gradient(to right, #6366F1, #8B5CF6)"
  }
];

const mockActivities = [
  { action: "Generated new brand concept for Quantum Coffee", time: "2 hours ago" },
  { action: "Created new project: Zenith Financial", time: "2 days ago" },
  { action: "Updated EcoMove logo design", time: "3 days ago" },
  { action: "Exported assets for NovaTech Solutions", time: "1 week ago" }
];