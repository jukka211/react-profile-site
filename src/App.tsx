// src/App.tsx
import React, { useEffect, useState } from 'react';
import { client } from './contentful';

interface ProfileFields {
  name: string;
  image?: {
    fields: {
      file: { url: string };
      title?: string;
    }
  };
  description: string;
  contact: string;
}

function App() {
  const [profiles, setProfiles] = useState<ProfileFields[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    client
      .getEntries({ content_type: 'profile' })
      .then((response) => {
        if (response.items.length === 0) {
          setError('No profiles found.');
        } else {
          setProfiles(response.items.map(item => item.fields as ProfileFields));
        }
      })
      .catch(() => {
        setError('Failed to load profiles.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <svg
          className="animate-spin h-8 w-8 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto p-6 mt-10 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map(({ name, image, description, contact }, idx) => {
        const imageUrl = image
          ? `https:${image.fields.file.url}`
          : '/placeholder-profile.png';
        const imageAlt = image?.fields.title || name;

        return (
          <div
            key={idx}
            className="shadow-lg rounded-xl p-6 flex flex-col items-center"
          >
            <img
              src={imageUrl}
              alt={imageAlt}
              className="w-24 h-24 rounded-full"
            />
            <h2 className="mt-4 text-xl font-semibold">{name}</h2>
            <p className="mt-2 whitespace-pre-line text-center">
              {description}
            </p>
            <a
              href={`mailto:${contact}`}
              className="mt-3 text-blue-500 hover:underline"
            >
              {contact}
            </a>
          </div>
        );
      })}
    </div>
  );
}

export default App;
