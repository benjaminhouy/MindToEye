import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, FolderIcon, CalendarIcon, InfoIcon } from "lucide-react";
import { Project } from "@shared/schema";
import { format } from "date-fns";

const Dashboard = () => {
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>
        <Link href="/projects/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-sm animate-pulse">
              <CardHeader className="bg-gray-100 h-24" />
              <CardContent className="py-4">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
              <CardFooter className="border-t border-gray-100 px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex">
            <InfoIcon className="h-5 w-5 mr-2" />
            <span>Failed to load projects. Please try again later.</span>
          </div>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="block">
              <Link href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow duration-300 cursor-pointer h-full">
                  <CardHeader className="bg-gradient-to-r from-primary-100 to-primary-50">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.clientName && (
                      <CardDescription>Client: {project.clientName}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="py-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                      Created on {format(new Date(project.createdAt), "MMM d, yyyy")}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-gray-100 px-6 py-4">
                    <Button variant="ghost" className="w-full">
                      <FolderIcon className="mr-2 h-4 w-4" />
                      Open Project
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
          <div className="mt-6">
            <Link href="/projects/new">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
