import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { fetchProfiles } from "../lib/nostr-profiles";

const RELAY_URL = import.meta.env.VITE_RELAY_URL!;
const PUBKEYS = [
  "b0c269c1da2ac18ef79a8027f4c8b043a0961889685514088808c86d75e9424a",
];

interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  website?: string;
}

function truncateNpub(npub: string) {
  return `${npub.slice(0, 13)}...${npub.slice(-14)}`;
}

export default function Profiles() {
  const [profiles, setProfiles] = useState<Record<string, NostrProfile>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fetchedProfiles = await fetchProfiles(PUBKEYS, RELAY_URL);
      setProfiles(fetchedProfiles);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Influencers</h1>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <progress className="progress w-56" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(profiles).map(([pubkey, profile]) => (
            <div
              key={pubkey}
              className="card card-side bg-base-100 shadow-sm border hover:shadow-md transition"
            >
              <figure className="w-32 min-w-32 h-32 overflow-hidden">
                <img
                  src={profile.picture || "/default-avatar.png"}
                  alt="Profile"
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-avatar.png";
                  }}
                />
              </figure>
              <div className="card-body p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold mr-2">
                    {profile.display_name || profile.name || "Unnamed"}
                  </h2>
                  <button
                    className="btn btn-xs btn-square btn-outline"
                    aria-label="Twitter"
                  >
                    <i className="bi bi-twitter text-sm" />
                  </button>
                  <button
                    className="btn btn-xs btn-square btn-outline"
                    aria-label="Facebook"
                  >
                    <i className="bi bi-facebook text-sm" />
                  </button>
                  <button
                    className="btn btn-xs btn-square btn-outline"
                    aria-label="Instagram"
                  >
                    <i className="bi bi-instagram text-sm" />
                  </button>
                </div>
                <p
                  className="text-xs text-gray-500 truncate w-full"
                  title={nip19.npubEncode(pubkey)}
                >
                  {truncateNpub(nip19.npubEncode(pubkey))}
                </p>
                <div className="card-actions justify-end">
                  <button
                    className="btn btn-sm btn-outline btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/detail/${pubkey}`);
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
