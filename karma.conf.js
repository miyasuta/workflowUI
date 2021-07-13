module.exports = function (config) {
    "use strict";

    config.set({
        frameworks: ["ui5"],
        ui5: {
            type: "application",
            configPath: "startUI/ui5.yaml",
            paths: {
                webapp: "startUI/webapp"
            }
        },
        browsers: ["Chrome"],
        browserConsoleLogOptions: {
            level: "error"
        }
    });
};
