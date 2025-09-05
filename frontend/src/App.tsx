import { Routes, Route } from "react-router-dom";
import Feed from "./pages/Feed";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreatorHub from "./pages/CreatorHub";
import VideoLibrary from "./components/VideoLibrary";
import CreatorVerification from "./components/CreatorVerification";
import Homepage from "./components/Homepage";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import CreateCommunity from "./components/CreateCommunity";
import React from "react";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider } from "./AuthContext";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/creator" element={<ProtectedRoute><CreatorHub /></ProtectedRoute>} />
        <Route path="/videos" element={<ProtectedRoute><VideoLibrary /></ProtectedRoute>} />
        <Route path="/creator/verify" element={<ProtectedRoute><CreatorVerification /></ProtectedRoute>} />
        <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
        <Route path="/communities/create" element={<ProtectedRoute><CreateCommunity /></ProtectedRoute>} />
        <Route path="/communities/:id" element={<ProtectedRoute><CommunityDetail /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;