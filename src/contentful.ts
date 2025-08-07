import { createClient } from 'contentful';

const spaceId   = import.meta.env.VITE_SPACE_ID as string;
const accessToken = import.meta.env.VITE_CDA_TOKEN as string;

if (!spaceId || !accessToken) {
  throw new Error('Missing Contentful environment variables');
}

export const client = createClient({
  space: spaceId,
  accessToken: accessToken,
});
