#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  appDir: '/var/www/bm.kcju.eu/app',
  releasesDir: '/var/www/bm.kcju.eu/app/releases',
  nodePath: '/opt/nodejs/bin',
  appName: 'band-manager'
};

function log(msg) {
  console.log(`[Deploy Agent] ${new Date().toISOString()} - ${msg}`);
}

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: CONFIG.appDir }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

async function deploy(version) {
  const releaseDir = path.join(CONFIG.releasesDir, version);
  
  if (!fs.existsSync(releaseDir)) {
    throw new Error(`Release directory ${releaseDir} does not exist`);
  }

  log(`Starting deployment of version ${version}`);

  process.env.PATH = `${CONFIG.nodePath}:${process.env.PATH}`;

  log('Installing dependencies...');
  await execAsync(`cd ${releaseDir} && npm ci --production`);

  log('Updating symlink...');
  const currentLink = path.join(CONFIG.appDir, 'current');
  if (fs.existsSync(currentLink)) {
    fs.unlinkSync(currentLink);
  }
  fs.symlinkSync(version, currentLink, 'dir');

  log('Restarting PM2...');
  const pm2Cmd = `${CONFIG.nodePath}/pm2`;
  try {
    await execAsync(`${pm2Cmd} restart ${CONFIG.appName}`);
  } catch {
    await execAsync(`${pm2Cmd} start ${releaseDir}/server.js --name ${CONFIG.appName}`);
  }

  log(`Deployment ${version} complete!`);
}

const version = process.argv[2];
if (!version) {
  console.error('Usage: node deploy-agent.js <version>');
  process.exit(1);
}

deploy(version)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`Deployment failed: ${err.message}`);
    process.exit(1);
  });
