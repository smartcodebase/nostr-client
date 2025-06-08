import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
// import NostrFeed from "./components/NostrFeed";
import NostrProfilesViewer from "./components/NostrProfilesViewer";
import DetailPage from "./components/DetailPage";
import Profiles from "./components/Profiles";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename="/nostr-client">
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<NostrProfilesViewer />} />
        <Route path="profiles" element={<Profiles />} />
        <Route path="detail/:pubkey" element={<DetailPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
