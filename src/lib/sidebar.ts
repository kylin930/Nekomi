import { config } from '../config/site';
import { sidebarSections } from './page-rules.mjs';
import { builtinCapabilities } from '../integrations/comments/capabilities';
import { externalUrl } from './urls';
import type { Post } from './posts';
export function sidebarModel(posts: Post[]) {
  const updates = [...posts].sort((a, b) => (b.data.updated || b.data.date).localeCompare(a.data.updated || a.data.date));
  const friends = config.friends.filter(f => externalUrl(f.url));
  const dynamicComments = !['none', 'link'].includes(config.comments.provider);
  const liveRecent = config.comments.recent && (config.comments.provider === 'custom' || (config.comments.provider in builtinCapabilities && builtinCapabilities[config.comments.provider as keyof typeof builtinCapabilities].recent));
  const comments = (dynamicComments ? [] : config.comments.items.filter(c => c.demo)).filter(c => c.author.trim() && c.excerpt.trim() && posts.some(p => p.id === c.postId && p.data.comments !== false)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const sections = sidebarSections(config.layout).filter(section => (section.id !== 'updates' || config.layout.recentPostsLimit > 0) && (section.id !== 'friends' || config.layout.friendsPreviewLimit > 0) && (section.id !== 'comments' || config.comments.recent && (liveRecent || comments.length > 0)));
  return { posts, updates, friends, comments, liveRecent, sections };
}
