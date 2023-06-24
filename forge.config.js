module.exports = {
  packagerConfig: {
    icon: "assets/kastella"
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {}
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: [
        "darwin"
      ]
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: "assets/kastella_512.png"
        }
      }
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {}
    }
  ]
};