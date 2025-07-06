import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Auth from './components/Auth';
import Home from './components/Home';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/home" element={<Home />} />
    </Routes>
  );
};

export default App;
