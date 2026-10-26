module.exports = {
  apps: [
    {
      name: 'itp-notebook',
      script: 'npx',
      args: 'http-server public -p 3000 -a 0.0.0.0 -c-1 --silent',
      cwd: '/home/user/webapp',
      env: { NODE_ENV: 'development' },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
