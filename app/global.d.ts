import type NodeCache from 'node-cache';

declare global {
  var sessionCache: NodeCache;
}

export {};