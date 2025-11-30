import React from "react";
import { Navigate } from "react-router-dom";


// The Protected Route is a wrapper that will decide if the users should be allowed to view the page - Robert
// It will use localStorage to check if the users is logged in and if they are not they will be redirected to the home page. - Robert
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    return <Navigate to="/" replace />; 
  }

  return children;
};

export default ProtectedRoute;
// Robert Simovski {100%}