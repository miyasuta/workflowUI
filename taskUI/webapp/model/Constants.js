sap.ui.define([], function () {
    "use strict"

    return {
        status: {
            INITIAL: 1,
            CAN_BE_PULLBACK: 2,
            PULLEDBACK: 3,
            DISPLAY_ONLY: 3
        },
        wfStatus: {
            RUNNING: "RUNNING",
            SUSPENDED: "SUSPENDED",
            CANCELED: "CANCELED",
            COMPLETED: "COMPLETED",
            ERRONEOUS: "ERRONEOUS"
        }
    };
});