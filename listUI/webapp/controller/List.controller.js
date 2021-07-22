sap.ui.define(["demo/listUI/controller/BaseController"], function (Controller) {
    "use strict";

    return Controller.extend("demo.listUI.controller.List", {
        onInit: function() {
            //bind table
            var oTable = this.byId("table");
            oTable.bindItems({
                path: '/WorkflowInstances',
                template: this.byId("items"),
                templateSharable: true,
                parameters: {
                    $expand: "Processors",
                    $filter: "Processors/any(d:d/userId eq 'mio.fujita.01@gmail.com')"
                }
            });
        },

        onNavigate: function (oEvent) {
            //Navigate to Detail App
            var selectedRow = oEvent.getParameter("id");
            var workflowId = this.byId(selectedRow).getBindingContext().getProperty("ID");

            if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
                var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation"); 
                oCrossAppNav.toExternal({
                    target: { semanticObject: "startUI", action: "display" },
                    params: { id: workflowId }
                })
            }
        }
    });
});
