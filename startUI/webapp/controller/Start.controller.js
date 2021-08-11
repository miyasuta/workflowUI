sap.ui.define([
    "demo/startUI/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/Constants",
    "sap/m/UploadCollectionParameter"
    ], function (Controller,
	JSONModel,
	MessageToast,
	MessageBox,
	constants,
	UploadCollectionParameter) {
    "use strict";

    return Controller.extend("demo.startUI.controller.App", {
        onInit: function () {
            //data model
            var oModel = new JSONModel({
                approvalSteps: [],
                requestId: "",
                subject: "",
                input: {
                    enabled: false
                },
                status: constants.status.INITIAL
            });
            this.setModel(oModel, "viewModel");
            //constants model
            var oConstants = new JSONModel(constants);
            this.setModel(oConstants, "constants");

            //attachments model
            this.setModel(new JSONModel(), "attachments");

            this.getRouter().getRoute("Start").attachMatched(this._onRouteMatched, this);

            this._oMessageManager = sap.ui.getCore().getMessageManager();
            this._oMessageManager.registerObject(this.getView(), true);

        },

        onAddApprovalStep: function () {
            var step = {
                    id: "",
                    comment: "",
                    taskType: "APPROVAL"
                };

            this._addApprovalStep(step);
        },

        _addApprovalStep: function (oStep) {
            var oApproverSteps = this.getModel("viewModel").getProperty("/approvalSteps");
            oApproverSteps.push(oStep);
            this.getModel("viewModel").setProperty("/approvalSteps", oApproverSteps);
            this.getModel("viewModel").refresh();
        },

        onPressRequestApproval: function () {
            this.getView().setBusy(true);
            if (this._workflowId) {
                //if workflow already exists, cancel it first
                this._exexuteAction("WorkflowService.cancel(...)")
                .then(()=>{
                    this._startInstance();
                })
            } else {
                this._startInstance();
            }
        },

        onPullBack: function () {
            this.getView().setBusy(true);
            this._exexuteAction("WorkflowService.suspend(...)")
            .then(()=>{
                //enable edit
                this.getModel("viewModel").setProperty("/input/enabled", true);
                //handle buttons
                this.getModel("viewModel").setProperty("/status", constants.status.PULLEDBACK);
                this.getView().setBusy(false);
            })
            .catch((err)=> {
                this._handleError(err);
            });
        },

        onCancelPullBack: function () {
            this._exexuteAction("WorkflowService.resume(...)")
            .then(()=>{
                this._handleDisplay(this._workflowId);
            })
            .catch((err)=> {
                this._handleError(err);
            });
        },

        onDeleteApprovalStep: function(oEvent) {
            var approvalSteps = this.getModel("viewModel").getProperty("/approvalSteps");
            var approvalStep = oEvent.getSource().getBindingContext("viewModel").getObject();

            for (var i = 0; i < approvalSteps.length; i++) {
                if (approvalSteps[i] == approvalStep) {
                    approvalSteps.splice(i, 1);
                    this.getModel("viewModel").refresh();
                    break;
                }
            }
        },

        _onRouteMatched: function (oEvent) {
            this._workflowId = this.getOwnerComponent().getModel("common").getProperty("/workflowId");

            // if workflowId is supplied, switch to display mode
            if (this._workflowId) {
                this._handleDisplay(this._workflowId);
            } else {
                this._handleCreate();
            }
        },

        onAttachmentsChange: function (oEvent) {
            var oUploadCollection = oEvent.getSource();
            oUploadCollection.addParameter(new UploadCollectionParameter({
                name: "cmisAction",
                value: "createDocument" // create file
            }));

            oUploadCollection.addParameter(new UploadCollectionParameter({
                name: "propertyId[0]",
                value: "cmis:objectTypeId"
            }));

            oUploadCollection.addParameter(new UploadCollectionParameter({
                name: "propertyValue[0]",
                value: "cmis:document"
            }));

            oUploadCollection.addParameter(new UploadCollectionParameter({
                name: "propertyId[1]",
                value: "cmis:name"
            }));

            oUploadCollection.addParameter(new UploadCollectionParameter({
                name: "propertyValue[1]",
                value: oEvent.getParameter("files")[0].name
            }));
        },

        onBeforeUploadStarts: function (oEvent) {
            var oUploadCollection = this.byId("uploadCollection"),
                oFileUploader = oUploadCollection._getFileUploader();
                oFileUploader.setUseMultipart(true);
                oEvent.getParameters().addHeaderParameter(new UploadCollectionParameter({
                    name: "X-CSRF-Token",
                    value: this.token
                }));
        },

        onUploadComplete: function (oEvent) {
            var oUploadCollection = this.byId("uploadCollection"),
                cItems = oUploadCollection.aItems.length,
                i;

            for (i = 0; i < cItems; i++) {
                if (oUploadCollection.aItems[i]._status === "uploading") {
                    oUploadCollection.aItems[i]._percentUploaded = 100;
                    oUploadCollection.aItems[i]._status = oUploadCollection._displayStatus;
                    oUploadCollection._oItemToUpdate = null;
                    break;
                }
            }

            oUploadCollection.getBinding("items").refresh();
            this._loadAttachments();
        },

        onDeletePressed: function (oEvent) {
            var sAttachmentsUploadURL = this.byId("uploadCollection").getUploadUrl();
            var item = oEvent.getSource().getBindingContext("attachments").getModel().getProperty(oEvent.getSource().getBindingContext("attachments").getPath());
            var objectId = item.object.succinctProperties["cmis:objectId"];
            var fileName = item.object.succinctProperties["cmis:name"];
            var oThisController = this;

            var oFormData = new window.FormData();
            oFormData.append("cmisAction", "delete");
            oFormData.append("objectId", objectId);

            var oSettings = {
                "url": sAttachmentsUploadURL,
                "method": "POST",
                "async": false,
                "data": oFormData,
                "cache": false,
                "contentType": false,
                "processData": false,
                "headers": {
                    'X-CSRF-Token': this.token
                }
            };

            $.ajax(oSettings)
                .done(() => {
                    MessageToast.show(`File '${fileName}' is deleted`);
                })
                .fail(err => {
                    if (err !== undefined) {
                        this._handleError($.parseJSON(err.responseText));
                    } else {
                        this._handleError(oThisController.getText("UNKNOWN_ERROR"));
                    }
                });
            this._loadAttachments();
        },

        _loadAttachments: function () {
            var oUploadCollection = this.byId("uploadCollection");
            var sAttachmentsUploadURL = oUploadCollection.getUploadUrl();
            var sUrl = sAttachmentsUploadURL + "?succinct=true";
            var oSettings = {
                "url": sUrl,
                "method": "GET"
            };

            var oThisController = this;

            $.ajax(oSettings)
                .done(results => {
                    oThisController._mapAttachmentsModel(results);
                    oUploadCollection.setBusy(false);
                })
                .fail(err => {
                    if (err !== undefined) {
                        var oErrResponse = $.parseJSON(err.responseText);
                        oThisController._handleError(oErrResponse);
                    } else {
                        oThisController._handleError(oThisController.getMessage("UNKNOWN_ERROR"));
                    }
                });
        },

        _mapAttachmentsModel: function (data) {
            this.getModel("attachments").setData(data);
            this.getModel("attachments").refresh();
        },

        _handleCreate: function () {
            var requestId = Math.floor(Date.now() / 1000).toString();
            this._createAttachmentURL(requestId);
            this.getModel("viewModel").setProperty("/requestId", requestId);
            this._setInitialSteps();
            this.getModel("viewModel").setProperty("/input/enabled", true);
        },

        _createAttachmentURL: function (folderName) {
            this.getView().setBusy(true);
            //check if folder "MuliLevelApproval" exists
            this._folderExists("MuliLevelApproval")
            //if it doesn't exist, create one
            .then((folderExists)=> {
                if (folderExists) {
                    return Promise.resolve();
                } else {
                    return this._createFolder("MuliLevelApproval");
                }
            })
            //then, create subfolder for this workflow instance
            .then(()=> {
                return this._createFolder(folderName);
            })
            .then((objectId)=> {
                //return attachment url
                var attachmentURL = this.getBaseURL() + `/docservice/WorkflowManagement/MuliLevelApproval/${folderName}/`;
                this.byId("uploadCollection").setUploadUrl(attachmentURL);
                this.getView().setBusy(false);
            })
            .catch((err)=>{
                this._handleError(err);
            });
        },

        _folderExists: function (folderName) {
            var url = this.getBaseURL() + `/docservice/WorkflowManagement/${folderName}/`;

            var oSettings = {
                "url": url,
                "method": "GET",
                "async": false,
                "headers": {
                    "ContentType": 'application/json',
                    "Accept": 'application/json',
                    "cache": false,
                    'X-CSRF-Token': 'Fetch'
                }
            };

            return new Promise((resolve, reject)=> {
                var oThisController = this;
                $.ajax(oSettings)
                    .done((results, textStatus, request) => {
                        oThisController.token = request.getResponseHeader('X-CSRF-Token');
                        if (request.status === 200) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    })
                    .fail((err)=> {
                        oThisController.token = err.getResponseHeader('X-Csrf-Token');
                        if (err.status === 404) {
                            resolve(false);
                        } else {
                            reject($.parseJSON(err.responseText).message);
                        }
                    });
            });
        },

        _createFolder: function (folderName) {
            var url;
            if (folderName === "MuliLevelApproval") {
                url = this.getBaseURL() + `/docservice/WorkflowManagement/`;
            } else {
                url = this.getBaseURL() + `/docservice/WorkflowManagement/MuliLevelApproval/`;
            }
            var oFormData = new window.FormData();
            oFormData.append("cmisAction", "createFolder");
            oFormData.append("succinct", "true");
            oFormData.append("propertyId[0]", "cmis:name");
            oFormData.append("propertyValue[0]", folderName);
            oFormData.append("propertyId[1]", "cmis:objectTypeId");
            oFormData.append("propertyValue[1]", "cmis:folder");

            var oSettings = {
                "url": url,
                "method": "POST",
                "async": false,
                "data": oFormData,
                "cache": false,
                "contentType": false,
                "processData": false,
                "headers": {
                    'X-CSRF-Token': this.token
                }
            };

            return new Promise((resolve, reject) => {
                $.ajax(oSettings)
                    .done((results) => {
                        resolve(results.succinctProperties["cmis:objectId"]);
                    })
                    .fail(err => {
                        if (err !== undefined) {
                            reject($.parseJSON(err.responseText).message);
                        }
                    });
            });
        },

        _setInitialSteps: function () {
            var initialStep = {
                index: 0,
                id: this.getOwnerComponent().getModel("userInfo").getProperty("/email"),
                comment: "",
                taskType: "REQUEST"
            };
            this._addApprovalStep(initialStep);
            var approvalStep = {
                index: 1,
                id: "",
                comment: "",
                taskType: "APPROVAL"
            }
            this._addApprovalStep(approvalStep);
        },

        _handleDisplay: function (workflowId) {
            this.getView().setBusy(true);
            var oModel = this.getModel();
            var oContextBinding = oModel.bindContext(`/WorkflowInstances(${workflowId})`, null, {
                $expand: "Processors"
            });
            oContextBinding.requestObject()
            .then(data=>{
                this.getModel("viewModel").setProperty("/requestId", data.businessKey);
                this.getModel("viewModel").setProperty("/subject", data.subject);
                //temporary: needs to be judged by workflow status
                this.getModel("viewModel").setProperty("/status", this._getStatus(data));
                this.getModel("viewModel").setProperty("/input/enabled", false);
                var processors = data.Processors.map(processor=>{
                    return {
                        id: processor.userId,
                        comment: processor.comment,
                        taskType: processor.taskType,
                        index: processor.index
                    }
                });
                this.getModel("viewModel").setProperty("/approvalSteps", processors);
                this.getView().setBusy(false);
            })
            .catch((err)=>{
                this._handleError(err);
            });
        },

        _handleError: function (err) {
            this.getView().setBusy(false);
            MessageBox.error(err);
        },

        _getStatus: function (oData) {
            //needs further judgement: to be implemented in the backend
            var status;
            switch (oData.status) {
                case constants.wfStatus.RUNNING:
                    status = constants.status.CAN_BE_PULLBACK;
                    break;
                case constants.wfStatus.SUSPENDED:
                    status = constants.status.PULLEDBACK;
                    break;
                default:
                    status = constants.status.DISPLAY_ONLY;
            };
            return status;
        },

        _startInstance: function () {
            var context = this._editContext();
            this._sendRequest(context)
            .then(()=>{
                this.getView().setBusy(false);
                //check if error exists
                if (this.getModel().hasPendingChanges()) {
                    var message = this._oMessageManager.getMessageModel().getData()[0].message;
                    this._handleError(message);
                } else {
                    this.getModel("viewModel").setProperty("/input/enabled", false);
                    MessageToast.show(this.getText("SUCCESS", []));
                }
            })
            .catch((err)=> {
                this._handleError(err);
            });
        },

        _exexuteAction (actionName) {
            var oModel = this.getModel();
            var oContext = oModel.createBindingContext(`/WorkflowInstances(${this._workflowId})`);
            var oAction = oModel.bindContext(actionName, oContext);
            return oAction.execute();
        },

        _sendRequest: function (context) {
            var oModel = this.getModel();
            var oListBinding = oModel.bindList("/WorkflowInstances");
            oListBinding.create(context);
            return oModel.submitBatch("$auto");
        },

        _editContext: function () {
            var oViewModel = this.getModel("viewModel");
            //approval steps
            var approvalSteps = oViewModel.getProperty("/approvalSteps");
            var aApprovalSteps = [];
            for (var i = 0; i < approvalSteps.length; i++) {
                aApprovalSteps.push({
                    userId: approvalSteps[i].id,
                    comment: approvalSteps[i].comment,
                    isComplete: approvalSteps[i].taskType === "REQUEST" ? true : false,
                    taskType: approvalSteps[i].taskType,
                    decision: "",
                    index: approvalSteps[i].index
                });
            }
            //requester
            var requester = this.getOwnerComponent().getModel("userInfo").getProperty("/email");

            var context = {
                businessKey: oViewModel.getProperty("/requestId"),
                requester: requester,
                subject: oViewModel.getProperty("/subject"),
                Processors: aApprovalSteps
            };

            if (this._workflowId) {
                context.referenceId = this._workflowId;
            }
            return context;
        },

        //formatters
        taskType: function (taskType) {
            return this.getText(taskType, []);
        },

        formatDownloadUrl: function (objectId) {
            var oUploadCollection = this.byId("uploadCollection");
            var sAttachmentsUploadURL = oUploadCollection.getUploadUrl();
            return sAttachmentsUploadURL + `?objectId=${objectId}&cmisselector=content`;
        }
    });
});
