const { chromium } = require('playwright');

async function checkInstagram(username) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(`https://www.instagram.com/${username}/`, { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    // Wait for React to render
    await page.waitForTimeout(3000);
    
    // Check for "page not available" or similar
    const content = await page.content();
    
    if (content.includes("Sorry, this page isn't available") || 
        content.includes("the link you followed may be broken")) {
      return { username, status: 'available', method: 'page_content' };
    }
    
    // Check for profile indicators
    if (content.includes('"username"') || content.includes('follower') || content.includes('following')) {
      return { username, status: 'taken', method: 'page_content' };
    }
    
    // Check page title
    const title = await page.title();
    if (title.includes('Instagram')) {
      return { username, status: 'unknown', method: 'title_check', title };
    }
    
    return { username, status: 'unknown', method: 'no_signal' };
  } catch (e) {
    return { username, status: 'error', error: e.message };
  } finally {
    await browser.close();
  }
}

// Run for multiple usernames
const users = process.argv.slice(2) || ['hamtask'];
Promise.all(users.map(u => checkInstagram(u))).then(results => {
  console.log(JSON.stringify(results, null, 2));
});
