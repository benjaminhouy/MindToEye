import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ProjectWorkspace from "@/pages/ProjectWorkspace";
import NewProject from "@/pages/NewProject";
import Header from "@/components/Header";
import AuthPage from "@/pages/Auth";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/">
          <ProtectedRoute>
            <div className="min-h-screen flex flex-col">
              <Header />
              <div className="flex-grow">
                <Dashboard />
              </div>
            </div>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <div className="min-h-screen flex flex-col">
              <Header />
              <div className="flex-grow">
                <Dashboard />
              </div>
            </div>
          </ProtectedRoute>
        </Route>
        <Route path="/projects/new">
          <ProtectedRoute>
            <div className="min-h-screen flex flex-col">
              <Header />
              <div className="flex-grow">
                <NewProject />
              </div>
            </div>
          </ProtectedRoute>
        </Route>
        <Route path="/projects/:id">
          {(params) => (
            <ProtectedRoute>
              <div className="min-h-screen flex flex-col">
                <Header />
                <div className="flex-grow">
                  <ProjectWorkspace id={params.id} />
                </div>
              </div>
            </ProtectedRoute>
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
