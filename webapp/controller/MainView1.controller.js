sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "com/eros/displaytransaction/lib/epos-2.27.0"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, MessageBox,epson2) {
        "use strict";
        var that;
        return Controller.extend("com.eros.displaytransaction.controller.MainView", {
            onInit: function () {
                this.oModel = this.getOwnerComponent().getModel();
                that = this;

            },
            fnClearSearch: function () {
                this.getView().byId("transId").setValue("");
                this.getView().byId("trandate").setValue("");
                this.getView().byId("tranType").setSelectedKey("");
                this.getView().byId("store").setValue("");
                this.getView().byId("custName").setValue("");
                this.getView().byId("custNu").setValue("");
                var data = new sap.ui.model.json.JSONModel();
                data.setData({});
                data.setData({ "TransactionData": {} })
                this.getView().byId("transRecords").setModel(data, "TransModel");
            },
            fnSearch: function () {
                var sTransId = this.byId("transId").getValue();
                var oDateRange = this.byId("trandate");
                var oFromDate = oDateRange.getDateValue();     // First Date
                var oToDate = oDateRange.getSecondDateValue(); // Second Date
                oFromDate = oFromDate ? this.resolveTimeDifference(oFromDate) : null;
                oToDate = oToDate ? this.resolveTimeDifference(oToDate) : null;

                var sTranType = this.byId("tranType").getSelectedKey();
                var sStore = this.byId("store").getValue();
                var sCustName = this.byId("custName").getValue();
                var sCustNu = this.byId("custNu").getValue();

                // If all filters are empty → show message
                if (!sTransId && !oFromDate && !oToDate && !sTranType && !sStore && !sCustName && !sCustNu) {
                    sap.m.MessageToast.show("Please enter at least one filter before searching.");
                    return;
                }

                this._loadData(sTransId, oFromDate, oToDate, sTranType, sStore, sCustName, sCustNu);
            },
            _loadData: function (transId, fromDate, toDate, tranType, store, custName, custNu) {
                var oModel = this.getView().getModel();
                var aFilters = [];
                var that = this;
                if (transId) aFilters.push(new sap.ui.model.Filter("TransactionId", "EQ", transId));
                if (tranType) aFilters.push(new sap.ui.model.Filter("TransactionType", "EQ", tranType));
                if (store) aFilters.push(new sap.ui.model.Filter("Store", "EQ", store));
                if (custName) aFilters.push(new sap.ui.model.Filter("CustomerName", "Contains", custName));
                if (custNu) aFilters.push(new sap.ui.model.Filter("ContactNo", "EQ", custNu));



                if (fromDate && toDate) {
                    aFilters.push(new sap.ui.model.Filter("TransactionDate", "BT", fromDate, toDate));
                } else if (fromDate) {
                    aFilters.push(new sap.ui.model.Filter("TransactionDate", "GE", fromDate)); // Greater or Equal
                } else if (toDate) {
                    aFilters.push(new sap.ui.model.Filter("TransactionDate", "LE", toDate)); // Less or Equal
                }

                this.oModel.read("/TransactionListSet", {
                    filters: aFilters,
                    urlParameters: {
                        "$expand": "ToItemsList"
                    },
                    success: function (oData) {
                        console.log(oData);
                        var data = new sap.ui.model.json.JSONModel();
                        data.setData({});
                        data.setData({ "TransactionData": oData.results })
                        that.getView().byId("transRecords").setModel(data, "TransModel");
                    }.bind(this),
                    error: function () {
                        sap.m.MessageToast.show("Error fetching data");
                    }
                });
            },
            _formatODataDate: function (oDate) {
                if (!oDate) return null;
                let year = oDate.getFullYear();
                let month = String(oDate.getMonth() + 1).padStart(2, '0');
                let day = String(oDate.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}T00:00:00`;
            },
            resolveTimeDifference: function (dateTime) {
                if (dateTime !== undefined && dateTime !== null && dateTime !== "") {
                    var offSet = dateTime.getTimezoneOffset();
                    var offSetVal = dateTime.getTimezoneOffset() / 60;
                    var h = Math.floor(Math.abs(offSetVal));
                    var m = Math.floor((Math.abs(offSetVal) * 60) % 60);
                    dateTime = new Date(dateTime.setHours(h, m, 0, 0));
                    return dateTime;

                }

                return null;

            },
            formatDateShort: function (value) {
                if (!value) return "";
                var oDate = new Date(value);
                var oFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MMM dd yyyy" });
                return oFormat.format(oDate);
            },
            formatTransactionType: function (value) {
                if (!value) return "";


                if (value === "1") {
                    return "Sales";
                } else if (value === "2") {
                    return "Sales Return";
                }
                else if (value === "3") {
                    return "Advance Receipt";
                }
                else if (value === "4") {
                    return "Advance Cancellation";
                }
                else if (value === "5") {
                    return "Sales Return with Refund";
                }



            },
            onProductRowPress: function (oEvent) {
                var that = this;
                var selIndexData = oEvent.getParameter("listItem").getBindingContext("TransModel").getObject();
                var oItemDetailModel = new sap.ui.model.json.JSONModel({});
                oItemDetailModel.setData({
                    "itemData": selIndexData.ToItemsList.results,
                    "TransactionType": selIndexData.TransactionType
                });

                if (!that._oDialogItemDetails) {
                    Fragment.load({
                        name: "com.eros.displaytransaction.fragment.itemDetail",
                        controller: that
                    }).then(function (oFragment) {
                        that._oDialogItemDetails = oFragment;
                        that.getView().addDependent(that._oDialogItemDetails);
                        sap.ui.getCore().setModel(oItemDetailModel, "itemDataModel");
                        that._oDialogItemDetails.setModel(oItemDetailModel, "itemDataModel");
                        that._oDialogItemDetails.open();
                    }.bind(that));
                } else {
                    that._oDialogItemDetails.setModel(oItemDetailModel, "itemDataModel");
                    sap.ui.getCore().setModel(oItemDetailModel, "itemDataModel");
                    that._oDialogItemDetails.open();
                }
            },
            onCloseItemDetail: function () {
                that._oDialogItemDetails.close();
            },
            onPrint: function () {
                var oTable = this.getView().byId("transRecords");
                var oSelectedItem = oTable.getSelectedItem();
                if (!oSelectedItem) {
                    sap.m.MessageToast.show("Please select a transaction before printing.");
                    return;
                }
                var that = this;
                var oSelectedData = oSelectedItem.getBindingContext("TransModel").getObject();
                that.sTransactionId = oSelectedData.TransactionId;
                if (!this._oPrintDialog) {
                    Fragment.load({
                        name: "com.eros.displaytransaction.fragment.printDialog",
                        controller: this
                    }).then(function (oDialog) {
                        that._oPrintDialog = oDialog;
                        that.getView().addDependent(oDialog);
                        sap.ui.getCore().byId("printTypebox").setVisible(true);
                        oDialog.open();
                    });
                } else {
                    sap.ui.getCore().byId("printTypebox").setVisible(true);
                    sap.ui.getCore().byId("printType").setSelectedKey("");
                    var oHtmlControl = sap.ui.getCore().byId("pdfCanvas");
                    var iframeContent = '<div id="pdf-viewport"></div>';
                    oHtmlControl.setContent(iframeContent);
                    oHtmlControl.setVisible(false);

                   var oPrintBox = sap.ui.getCore().byId("printBox");
                   oPrintBox.setVisible(false);
                    this._oPrintDialog.open();
                 }
            },
            onConfirmPrint: function () {
                var oCombo = sap.ui.getCore().byId("printType");
                var sType = oCombo.getSelectedKey();

                if (!sType) {
                    sap.m.MessageToast.show("Please select a print type.");
                    return;
                }

                this.getPDFBase64(sType)
                //this._oPrintDialog.close();
            },

            onCancelPrint: function () {
                that._oPrintDialog.close();
            },
            getPDFBase64: function (sType) {
                var that = this;
                var sPath = "/PrintPDFSet(TransactionId='" + that.sTransactionId + "',PDFType='" + sType + "')";
                this.oModel.read(sPath, {
                    urlParameters: { "$expand": "ToPDFList" },
                    success: function (oData) {
                        if (oData.ToPDFList.results[0] && oData.ToPDFList.results[0].Value) {
                            that.onShowPDFSEPP(oData.ToPDFList.results[0].Value);
                        }
                        else {
                            sap.m.MessageToast.show("Error fetching PDF.");
                        }
                    },
                    error: function () {
                        sap.m.MessageToast.show("Error fetching PDF.");
                    }
                });

            },
            onShowPDFSEPP: async function (base64Content) {
                  sap.ui.getCore().byId("printTypebox").setVisible(false);
                  var oHtmlControl = sap.ui.getCore().byId("pdfCanvas");
                  var iframeContent = '<div id="pdf-viewport"></div>';
                  oHtmlControl.setContent(iframeContent);
                  oHtmlControl.setVisible(true);

                var oPrintBox = sap.ui.getCore().byId("printBox");
                oPrintBox.setVisible(true);

                var byteCharacters = atob(base64Content);
                var byteNumbers = new Array(byteCharacters.length);

                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }

                var byteArray = new Uint8Array(byteNumbers);


                var blob = new Blob([byteArray], {
                    type: 'application/pdf'
                });


                var pdfUrl = URL.createObjectURL(blob);

                var printerIp = "192.168.10.75"; // your Epson printer IP

                try {
                    const canvas = await this.loadPdfToCanvas(pdfUrl);
                    this.canvasp = canvas;
                    this.printerIP = printerIp;

                    this.sendToEpsonPrinter(canvas, printerIp);
                } catch (err) {
                    MessageBox.error("Error rendering or printing PDF: " + err.message);
                }

            },
            isSingleColor: function (imageData) {
                const stride = 4;
                for (let offset = 0; offset < stride; offset++) {
                    const first = imageData[offset];
                    for (let i = offset; i < imageData.length; i += stride) {
                        if (first !== imageData[i]) {
                            return false;
                        }
                    }
                }
                return true;
            },
            loadPdfToCanvas: async function (pdfUrl) {
                await this.ensurePdfJsLib();

                try {
                    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
                    const printerWidth = 576;
                    const canvasArray = [];

                    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                        const page = await pdfDoc.getPage(pageNum);
                        const scale = printerWidth / page.getViewport({ scale: 1 }).width;
                        const viewport = page.getViewport({ scale });
                        const pdfContainer = document.getElementById("pdf-viewport");
                        const canvas = document.createElement("canvas");
                        // pdfContainer.appendChild(canvas);
                        const width = viewport.width;
                        const height = viewport.height;
                        canvas.height = height;
                        canvas.width = width;
                        canvas.style.width = Math.floor(width) + "px";
                        canvas.style.height = Math.floor(height) + "px";
                        canvas.setAttribute("willReadFrequently", "true");
                        // canvas.width = viewport.width;
                        // canvas.height = viewport.height;
                        const context = canvas.getContext("2d", { willReadFrequently: true });
                        context.clearRect(0, 0, width, height);

                        await page.render({
                            canvasContext: context,
                            viewport
                        }).promise;

                        let top = 0;
                        let bottom = height;
                        let left = 0;
                        let right = width;

                        while (top < bottom) {
                            const imageData = context.getImageData(
                                left,
                                top,
                                right - left,
                                1
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            top++;
                        }
                        while (top < bottom) {
                            const imageData = context.getImageData(
                                left,
                                bottom,
                                right - left,
                                1
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            bottom--;
                        }
                        while (left < right) {
                            const imageData = context.getImageData(
                                left,
                                top,
                                1,
                                bottom - top
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            left++;
                        }
                        while (left < right) {
                            const imageData = context.getImageData(
                                right,
                                top,
                                1,
                                bottom - top
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            right--;
                        }

                        context.clearRect(0, 0, width, height);
                        const adjustedScale = printerWidth / (right - left);
                        const adjustedWidth = (right - left) * adjustedScale;
                        const adjustedHeight = (bottom - top) * adjustedScale;

                        canvas.height = adjustedHeight + 10;
                        canvas.width = adjustedWidth;
                        canvas.style.width = `${adjustedWidth}px`;
                        canvas.style.height = `${adjustedHeight}px`;

                        pdfContainer.appendChild(canvas);
                        await page.render({
                            canvasContext: context,
                            viewport,
                        }).promise;

                        // Store each rendered canvas
                        canvasArray.push(canvas);
                    }

                    // Now return array of canvases or send to printer
                    return canvasArray;

                } catch (error) {
                    console.error("Error loading PDF:", error);
                    MessageToast.show("Failed to load PDF: " + error.message);
                }
            },
            ensurePdfJsLib: async function () {
                if (!window.pdfjsLib) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement("script");
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib = window['pdfjs-dist/build/pdf'];
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
            },

            sendToEpsonPrinter: function (canvases, printerIp) {
                var ePosDev = new epson.ePOSDevice();
              
                //printerIp = this.printerIP;
                ePosDev.connect(printerIp, 8043, function (resultConnect) {
                    if (resultConnect === "OK" || resultConnect == "SSL_CONNECT_OK") {
                        ePosDev.createDevice("local_printer", ePosDev.DEVICE_TYPE_PRINTER,
                            { crypto: false, buffer: false },
                            function (deviceObj, resultCreate) {
                                if (resultCreate === "OK") {
                                    var printer = deviceObj;



                                    printer.brightness = 1.0;
                                    printer.halftone = printer.HALFTONE_ERROR_DIFFUSION;
                                    for (const canvas of canvases) {
                                        printer.addImage(canvas.getContext("2d", { willReadFrequently: true }), 0, 0, canvas.width, canvas.height, printer.COLOR_1, printer.MODE_MONO);
                                    }


                                    printer.addCut(printer.CUT_FEED);
                                    printer.send();

                                    window.location.reload(true);

                                    // printer.send(function (resultSend) {
                                    //     if (resultSend === "OK") {
                                    //         sap.m.MessageToast.show("Printed successfully!");
                                    //     } else {
                                    //         sap.m.MessageBox.error("Print failed: " + resultSend);
                                    //     }
                                    // });
                                } else {
                                    sap.m.MessageBox.error("Failed to create device: " + resultCreate);
                                }
                            }
                        );
                    } else {
                        //sap.m.MessageBox.error("Connection failed: " + resultConnect);
                        sap.m.MessageBox.error("Connection failed: " + resultConnect, {
                            title: "Error",
                            actions: [sap.m.MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === sap.m.MessageBox.Action.OK) {
                                    window.location.reload(true);
                                }
                            }.bind(this)
                        });
                    }
                });
            },

        });
    });
