const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = ''; // REPLACE_WITH_YOUR_GITHUB_TOKEN
const USERNAME = 'aomampz6';
const REPO = 'FAST-System';

const BASE_DIR = __dirname;
const IGNORE_DIRS = ['node_modules', '.git', '.env'];

function request(method, urlPath, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: urlPath,
            method: method,
            headers: {
                'Authorization': `token ${TOKEN}`,
                'User-Agent': 'NodeJS-Script',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : null);
                } else {
                    reject(new Error(`API Error: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (IGNORE_DIRS.includes(file)) continue;
        
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, fileList);
        } else {
            // Ignore .env and other unwanted files
            if (file === '.env' || file === 'upload_to_github.js' || file === 'package-lock.json') continue;
            fileList.push(filePath);
        }
    }
    return fileList;
}

async function uploadToGithub() {
    try {
        console.log(`Creating repository ${REPO}...`);
        try {
            await request('POST', '/user/repos', {
                name: REPO,
                description: 'Field Assistant System for Technician',
                private: false,
                auto_init: true
            });
            console.log('Repository created.');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('Repository already exists. Proceeding...');
            } else {
                throw e;
            }
        }

        // Wait a few seconds for repo initialization
        await new Promise(r => setTimeout(r, 3000));

        let baseTreeSha = null;
        let commitSha = null;

        console.log('Fetching main branch reference...');
        try {
            const refData = await request('GET', `/repos/${USERNAME}/${REPO}/git/refs/heads/main`);
            commitSha = refData.object.sha;

            console.log('Fetching base commit tree...');
            const commitData = await request('GET', `/repos/${USERNAME}/${REPO}/git/commits/${commitSha}`);
            baseTreeSha = commitData.tree.sha;
        } catch (e) {
            console.log('Repository is completely empty. Initializing with README.md via Contents API...');
            await request('PUT', `/repos/${USERNAME}/${REPO}/contents/README.md`, {
                message: 'Initial commit: Create README.md',
                content: Buffer.from('# FAST System\\nField Assistant System for Technician').toString('base64')
            });
            console.log('Repository initialized. Fetching main branch reference again...');
            const refData = await request('GET', `/repos/${USERNAME}/${REPO}/git/refs/heads/main`);
            commitSha = refData.object.sha;

            const commitData = await request('GET', `/repos/${USERNAME}/${REPO}/git/commits/${commitSha}`);
            baseTreeSha = commitData.tree.sha;
        }

        const filesToUpload = await getFiles(BASE_DIR);
        console.log(`Found ${filesToUpload.length} files to upload.`);

        const treeEntries = [];

        for (const filePath of filesToUpload) {
            const relativePath = path.relative(BASE_DIR, filePath).replace(/\\/g, '/');
            console.log(`Uploading ${relativePath}...`);
            
            const fileContent = fs.readFileSync(filePath);
            
            const blobData = await request('POST', `/repos/${USERNAME}/${REPO}/git/blobs`, {
                content: fileContent.toString('base64'),
                encoding: 'base64'
            });

            treeEntries.push({
                path: relativePath,
                mode: '100644',
                type: 'blob',
                sha: blobData.sha
            });
        }

        console.log('Creating new tree...');
        const treePayload = { tree: treeEntries };
        if (baseTreeSha) {
            treePayload.base_tree = baseTreeSha;
        }
        
        const newTreeData = await request('POST', `/repos/${USERNAME}/${REPO}/git/trees`, treePayload);

        console.log('Creating commit...');
        const commitPayload = {
            message: 'Update from automated push',
            tree: newTreeData.sha
        };
        if (commitSha) {
            commitPayload.parents = [commitSha];
        }

        const newCommitData = await request('POST', `/repos/${USERNAME}/${REPO}/git/commits`, commitPayload);

        console.log('Updating or creating main reference...');
        if (commitSha) {
            await request('PATCH', `/repos/${USERNAME}/${REPO}/git/refs/heads/main`, {
                sha: newCommitData.sha
            });
        } else {
            // If the repository is completely empty, we need to create the reference
            await request('POST', `/repos/${USERNAME}/${REPO}/git/refs`, {
                ref: 'refs/heads/main',
                sha: newCommitData.sha
            });
        }

        console.log('Upload complete! 🎉');
        console.log(`Check your repository here: https://github.com/${USERNAME}/${REPO}`);

    } catch (err) {
        console.error('An error occurred:', err);
    }
}

uploadToGithub();
