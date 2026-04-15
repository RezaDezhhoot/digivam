import { ref } from 'vue';
import { getWebSiteConfig } from '../services/web-loan.api.js';

const siteLogoUrl = ref('');
let fetchAttempted = false;

export const useSiteConfig = () => {
  const setSiteConfig = (site) => {
    if (site?.siteLogoUrl && !siteLogoUrl.value) {
      siteLogoUrl.value = site.siteLogoUrl;
    }
  };

  const ensureSiteConfig = async () => {
    if (siteLogoUrl.value || fetchAttempted) return;
    fetchAttempted = true;
    try {
      const data = await getWebSiteConfig();
      setSiteConfig(data.site);
    } catch {
      /* ignore */
    }
  };

  return { siteLogoUrl, setSiteConfig, ensureSiteConfig };
};
