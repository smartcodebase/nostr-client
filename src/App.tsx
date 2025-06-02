import "./App.css";
import NostrFeed from "./components/NostrFeed";
import NostrProfilesViewer from "./components/NostrProfilesViewer";

function App() {
  return (
    <>
      <h2> Nostr Viewer </h2>
      {/* <NostrFeed /> */}
      <NostrProfilesViewer />
    </>
  );
}

export default App;
