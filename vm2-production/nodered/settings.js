module.exports = {
    // Node-RED Settings
    flowFile: 'flows.json',
    flowFilePretty: true,
    
    // Admin API
    adminAuth: {
        type: "credentials",
        users: [{
            username: "admin",
            password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy", // admin123
            permissions: "*"
        }]
    },
    
    // HTTP Node
    httpNodeRoot: '/',
    httpAdminRoot: '/',
    
    // Logging
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },
    
    // Editor
    editorTheme: {
        projects: {
            enabled: false
        }
    }
};


