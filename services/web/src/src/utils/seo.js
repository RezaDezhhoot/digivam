const metaDefinitions = [
  { key: 'description', selector: 'meta[name="description"]', attr: 'name', value: 'description' },
  { key: 'keywords', selector: 'meta[name="keywords"]', attr: 'name', value: 'keywords' },
  { key: 'robots', selector: 'meta[name="robots"]', attr: 'name', value: 'robots' },
  { key: 'og:title', selector: 'meta[property="og:title"]', attr: 'property', value: 'og:title' },
  { key: 'og:description', selector: 'meta[property="og:description"]', attr: 'property', value: 'og:description' },
  { key: 'og:type', selector: 'meta[property="og:type"]', attr: 'property', value: 'og:type' },
  { key: 'og:url', selector: 'meta[property="og:url"]', attr: 'property', value: 'og:url' },
  { key: 'og:image', selector: 'meta[property="og:image"]', attr: 'property', value: 'og:image' },
  { key: 'og:site_name', selector: 'meta[property="og:site_name"]', attr: 'property', value: 'og:site_name' },
  { key: 'twitter:card', selector: 'meta[name="twitter:card"]', attr: 'name', value: 'twitter:card' },
  { key: 'twitter:title', selector: 'meta[name="twitter:title"]', attr: 'name', value: 'twitter:title' },
  { key: 'twitter:description', selector: 'meta[name="twitter:description"]', attr: 'name', value: 'twitter:description' },
  { key: 'twitter:image', selector: 'meta[name="twitter:image"]', attr: 'name', value: 'twitter:image' }
];

const linkDefinitions = [
  { key: 'canonical', selector: 'link[rel="canonical"]', rel: 'canonical' },
  { key: 'icon', selector: 'link[rel="icon"]', rel: 'icon' },
  { key: 'shortcut-icon', selector: 'link[rel="shortcut icon"]', rel: 'shortcut icon' }
];

const initialState = {
  initialized: false,
  title: '',
  metas: new Map(),
  links: new Map()
};

const ensureState = () => {
  if (initialState.initialized) {
    return;
  }

  initialState.initialized = true;
  initialState.title = document.title;

  metaDefinitions.forEach((definition) => {
    const node = document.head.querySelector(definition.selector);
    initialState.metas.set(definition.key, {
      exists: Boolean(node),
      content: node?.getAttribute('content') || ''
    });
  });

  linkDefinitions.forEach((definition) => {
    const node = document.head.querySelector(definition.selector);
    initialState.links.set(definition.key, {
      exists: Boolean(node),
      href: node?.getAttribute('href') || ''
    });
  });
};

const ensureMetaNode = (definition) => {
  let node = document.head.querySelector(definition.selector);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(definition.attr, definition.value);
    node.dataset.seoManaged = 'true';
    document.head.appendChild(node);
  }

  return node;
};

const ensureLinkNode = (definition) => {
  let node = document.head.querySelector(definition.selector);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', definition.rel);
    node.dataset.seoManaged = 'true';
    document.head.appendChild(node);
  }

  return node;
};

const setMeta = (key, content) => {
  const definition = metaDefinitions.find((item) => item.key === key);
  if (!definition) {
    return;
  }

  const node = ensureMetaNode(definition);
  if (content) {
    node.setAttribute('content', String(content));
  } else {
    node.removeAttribute('content');
  }
};

const setLink = (key, href) => {
  const definition = linkDefinitions.find((item) => item.key === key);
  if (!definition) {
    return;
  }

  const node = ensureLinkNode(definition);
  if (href) {
    node.setAttribute('href', String(href));
  } else {
    node.removeAttribute('href');
  }
};

const clearManagedJsonLd = () => {
  document.querySelectorAll('script[type="application/ld+json"][data-seo-managed="true"]').forEach((node) => node.remove());
};

const appendJsonLd = (payload) => {
  const items = Array.isArray(payload) ? payload : [payload];

  items.filter(Boolean).forEach((item) => {
    const node = document.createElement('script');
    node.type = 'application/ld+json';
    node.dataset.seoManaged = 'true';
    node.textContent = JSON.stringify(item);
    document.head.appendChild(node);
  });
};

export const applySeo = ({
  title,
  description,
  keywords,
  robots = 'index,follow',
  url,
  canonicalUrl,
  image,
  favicon,
  siteName,
  type = 'website',
  jsonLd
} = {}) => {
  ensureState();

  if (title) {
    document.title = String(title);
  }

  const resolvedUrl = url || canonicalUrl || window.location.href;
  const resolvedCanonical = canonicalUrl || resolvedUrl;
  const twitterCard = image ? 'summary_large_image' : 'summary';

  setMeta('description', description);
  setMeta('keywords', keywords);
  setMeta('robots', robots);
  setMeta('og:title', title);
  setMeta('og:description', description);
  setMeta('og:type', type);
  setMeta('og:url', resolvedUrl);
  setMeta('og:image', image);
  setMeta('og:site_name', siteName);
  setMeta('twitter:card', twitterCard);
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);
  setLink('canonical', resolvedCanonical);
  setLink('icon', favicon);
  setLink('shortcut-icon', favicon);

  clearManagedJsonLd();
  if (jsonLd) {
    appendJsonLd(jsonLd);
  }
};

export const resetSeo = () => {
  ensureState();
  document.title = initialState.title;

  metaDefinitions.forEach((definition) => {
    const snapshot = initialState.metas.get(definition.key);
    const node = document.head.querySelector(definition.selector);

    if (snapshot?.exists) {
      const target = node || ensureMetaNode(definition);
      target.setAttribute('content', snapshot.content || '');
      if (!snapshot.content) {
        target.removeAttribute('content');
      }
      delete target.dataset.seoManaged;
      return;
    }

    if (node) {
      node.remove();
    }
  });

  linkDefinitions.forEach((definition) => {
    const snapshot = initialState.links.get(definition.key);
    const node = document.head.querySelector(definition.selector);

    if (snapshot?.exists) {
      const target = node || ensureLinkNode(definition);
      target.setAttribute('href', snapshot.href || '');
      if (!snapshot.href) {
        target.removeAttribute('href');
      }
      delete target.dataset.seoManaged;
      return;
    }

    if (node) {
      node.remove();
    }
  });

  clearManagedJsonLd();
};