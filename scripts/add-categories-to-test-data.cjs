const fs = require('fs');
const path = require('path');

const files = [
  {
    path: 'tests/e2e/data/tier1-identity.data.ts',
    categories: {
      'UC-01A': 'business',
      'UC-01B': 'business',
      'UC-01C': 'business',
      'UC-01D': 'business',
      'UC-01E': 'technical',
      'UC-01F': 'technical',
      'UC-01G': 'technical',
      'UC-01H': 'business',
      'UC-01I': 'business',
      'UC-01J': 'technical',
      'UC-01K': 'technical',
      'UC-01': 'business',
      'UC-02': 'business',
      'UC-03': 'business',
    }
  },
  {
    path: 'tests/e2e/data/tier2-commerce.data.ts',
    categories: {
      'UC-04': 'business',
      'UC-05': 'business',
      'UC-06': 'business',
      'UC-07': 'business',
    }
  },
  {
    path: 'tests/e2e/data/tier3-custody.data.ts',
    categories: {
      'UC-08': 'business',
      'UC-09': 'business',
      'UC-10': 'business',
      'UC-11': 'business',
      'UC-12': 'business',
      'UC-13': 'business',
    }
  },
  {
    path: 'tests/e2e/data/tier4-governance.data.ts',
    categories: {
      'UC-14': 'technical',
      'UC-15': 'technical',
      'UC-16': 'business',
      'UC-17': 'technical',
      'UC-18': 'technical',
      'UC-19': 'technical',
      'UC-20': 'business',
      'UC-21': 'business',
    }
  },
  {
    path: 'tests/e2e/data/tier5-platform.data.ts',
    categories: {
      'UC-22': 'technical',
      'UC-23': 'business',
      'UC-24': 'technical',
      'UC-25': 'technical',
      'UC-26': 'technical',
      'UC-27': 'technical',
      'UC-28': 'technical',
    }
  },
  {
    path: 'tests/e2e/data/tier6-refunds-credit.data.ts',
    categories: {
      'UC-29': 'business',
      'UC-30': 'business',
      'UC-31': 'business',
    }
  }
];

for (const item of files) {
  let content = fs.readFileSync(item.path, 'utf8');
  for (const [ucId, cat] of Object.entries(item.categories)) {
    // Look for useCaseId: 'UC-...' and ensure category: '...' is inserted right after tier: '...'
    const regex = new RegExp(`(useCaseId:\\s*'${ucId}',[\\s\\S]*?tier:\\s*'[^']+',)(\\s*)`, 'g');
    content = content.replace(regex, (match, p1, p2) => {
      if (match.includes("category:")) return match;
      return `${p1}\n    category: '${cat}',${p2}`;
    });
  }
  fs.writeFileSync(item.path, content, 'utf8');
  console.log(`Updated categories in ${item.path}`);
}

