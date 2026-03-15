import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Experiences from "./pages/Experiences";
import Challenges from "./pages/Challenges";
import Profile from "./pages/Profile";
import ExperienceDetail from "./pages/ExperienceDetail";
import CreateExperience from "./pages/CreateExperience";
import Token from "./pages/Token";
import Map from "./pages/Map";
import AppTutorial from "./pages/AppTutorial";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/tutorial" component={AppTutorial} />
      <Route path="/home" component={Home} />
      <Route path="/experiences" component={Experiences} />
      <Route path="/challenges" component={Challenges} />
      <Route path="/token" component={Token} />
      <Route path="/map" component={Map} />
      <Route path="/u/:username" component={Profile} />
      <Route path="/experience/:id" component={ExperienceDetail} />
      <Route path="/create" component={CreateExperience} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
