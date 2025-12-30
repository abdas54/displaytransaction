sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "com/eros/displaytransaction/lib/epos-2.27.0"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, MessageBox, epson2) {
        "use strict";
        var that;
        return Controller.extend("com.eros.displaytransaction.controller.MainView", {
            onInit: function () {
                this.oModel = this.getOwnerComponent().getModel();
                this.validateLoggedInUser();
                that = this;

            },
              validateLoggedInUser: function () {
                var that = this;
                that.printerIP = [];
                this.oModel.read("/StoreIDSet", {
                    success: function (oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp1 ? oData.results[0].PrinterIp1 : "" : "");
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp2 ? oData.results[0].PrinterIp2 : "" : "");
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp3 ? oData.results[0].PrinterIp3 : "" : "");
                        that.getView().byId("store").setValue(that.storeID);
                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    window.history.go(-1);
                                }
                            }
                        });
                    }
                });
            },
            fnClearSearch: function () {
                this.getView().byId("transId").setValue("");
                this.getView().byId("trandate").setValue("");
                this.getView().byId("tranType").setSelectedKey("");
                // this.getView().byId("store").setValue("");
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
                        sap.ui.getCore().byId("ipBox").setVisible(false);
                        sap.ui.getCore().byId("printTypebox").setVisible(true);
                        oDialog.open();
                    });
                } else {
                    sap.ui.getCore().byId("ipBox").setVisible(false);
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
                var ipBox = sap.ui.getCore().byId("ipBox");
                ipBox.setVisible(false);
                that._oPrintDialog.close();
            },
            getPDFBase64: async function (sType) {
                var that = this;
                this.aCanvas = [];
                var sPath = "/PrintPDFSet(TransactionId='" + that.sTransactionId + "',PDFType='" + sType + "',Reprint='X')";
                if (that._oPrintDialog) {
                                    that._oPrintDialog.setBusy(true);
                                }
                this.oModel.read(sPath, {
                    urlParameters: { "$expand": "ToPDFList" },
                    success: async function (oData) {
                        //   sap.ui.getCore().byId("ipBox").setVisible(false);
                        //   sap.ui.getCore().byId("printTypebox").setVisible(false);

                        var aResults = oData.ToPDFList.results;

                        if (aResults && aResults.length > 0) {
                            // Sort by sequence if needed
                            aResults.sort((a, b) => parseInt(a.SequenceId) - parseInt(b.SequenceId));

                            // Print each PDF one by one
                            for (let i = 0; i < aResults.length; i++) {
                                const pdfBase64 = aResults[i].Value;
                                try {
                                    await that.printSinglePDF(pdfBase64, i + 1, aResults.length);
                                } catch (err) {
                                    
                                    break; // stop if a print fails
                                }
                                if(aResults.length - 1 === i){
                                     if (that._oPrintDialog) {
                                    that._oPrintDialog.setBusy(false);
                                }
                                }
                            }

                           
                        } else {
                            sap.m.MessageToast.show("No PDF data available.");
                        }


                    },
                    error: function () {
                        sap.m.MessageToast.show("Error fetching PDF.");
                    }
                });

            },
            printSinglePDF: async function (base64Content, currentIndex, total) {

                if (document.getElementById("pdf-viewport")) {
                    if (currentIndex === 1) {
                        document.getElementById("pdf-viewport").innerHTML = "";
                    }

                }
                //sap.m.MessageToast.show(`Printing ${currentIndex} of ${total}...`);
                sap.ui.getCore().byId("printTypebox").setVisible(true);
                var oHtmlControl = sap.ui.getCore().byId("pdfCanvas");
                var iframeContent = '<div id="pdf-viewport"></div>';
                oHtmlControl.setContent(iframeContent);
                oHtmlControl.setVisible(true);

                var oPrintBox = sap.ui.getCore().byId("printBox");
                oPrintBox.setVisible(true);

                // Decode and render as before
                const byteCharacters = atob(base64Content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const pdfUrl = URL.createObjectURL(blob);

                try {
                    const canvases = await this.loadPdfToCanvas(pdfUrl);
                    this.aCanvas.push(canvases);
                    const printerIp =  "192.168.1.183";  //"192.168.10.75";
                    this.sPrinter = printerIp; // your Epson printer IP

                    //await this.sendToEpsonPrinterPromise(canvases, printerIp);
                } catch (err) {
                    throw new Error("Failed to print PDF " + currentIndex + ": " + err.message);
                }
            },
            onPressPrint: function (oEvent) {
                oEvent.getSource().setEnabled(false);
                this.sendToEpsonPrinter(this.aCanvas, this.printIP);
            },
            sendToEpsonPrinter: async function (canvasesArray, printerIp, count) {
                var ePosDev = new epson.ePOSDevice();
                var that = this;
                //var ip = this.getView().byId("ipaddr").getValue();
                // var wdth = this.getView().byId("wdth").getValue();
                // var ht = this.getView().byId("heht").getValue();
                //printerIp = this.printerIP;

                for (let a = 0; a < canvasesArray.length; a++) {
                    that.counter = a;
                    const canvases = canvasesArray[a];
                    await new Promise((resolve, reject) => {
                        ePosDev.connect(printerIp, 8043, function (resultConnect) {
                            if (resultConnect === "OK" || resultConnect == "SSL_CONNECT_OK") {
                                ePosDev.createDevice("local_printer", ePosDev.DEVICE_TYPE_PRINTER,
                                    { crypto: false, buffer: false },
                                    async function (deviceObj, resultCreate) {
                                        if (resultCreate === "OK") {
                                            var printer = deviceObj;



                                            printer.brightness = 1.0;
                                            printer.halftone = printer.HALFTONE_ERROR_DIFFUSION;
                                            for (const canvas of canvases) {
                                                printer.addImage(canvas.getContext("2d", { willReadFrequently: true }), 0, 0, canvas.width, canvas.height, printer.COLOR_1, printer.MODE_MONO);
                                            }


                                            printer.addCut(printer.CUT_FEED);
                                            await printer.send();
                                            resolve();
                                            if (canvasesArray.length === that.counter + 1) {
                                                window.location.reload(true);
                                            }
                                            // printer.send(function (resultSend) {
                                            //     if (resultSend === "OK") {
                                            //         sap.m.MessageToast.show("Printed successfully!");
                                            //     } else {
                                            //         sap.m.MessageBox.error("Print failed: " + resultSend);
                                            //     }
                                            // });
                                        } else {
                                            sap.m.MessageBox.error("Failed to create device: " + resultCreate);
                                            reject(resultCreate);
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
                    });
                }

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
                        //const canvas = document.createElement("canvas");
                       const { canvas, context } = this.createHiDPICanvas(viewport.width,viewport.height);
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
                       // const context = canvas.getContext("2d", { willReadFrequently: true });
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
            getPixelRatio: function () {
                var ctx = document.createElement("canvas").getContext("2d"),
                    dpr = window.devicePixelRatio || 1,
                    bsr =
                        ctx.webkitBackingStorePixelRatio ||
                        ctx.mozBackingStorePixelRatio ||
                        ctx.msBackingStorePixelRatio ||
                        ctx.oBackingStorePixelRatio ||
                        ctx.backingStorePixelRatio ||
                        1;

                return dpr / bsr;
            },

            createHiDPICanvas: function (w, h, ratio) {
                if (!ratio) {
                    ratio = this.getPixelRatio();
                }
                const canvas = document.createElement("canvas");
                canvas.width = w * ratio;
                canvas.height = h * ratio;
                canvas.style.width = w + "px";
                canvas.style.height = h + "px";
                const context = canvas.getContext("2d", {
                    willReadFrequently: true,
                });
                context.setTransform(ratio, 0, 0, ratio, 0, 0);
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";
                context.font = "64px NotoSansArabic";
                return { canvas, context };
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

            sendToEpsonPrinter: async function (canvasesArray, printerIp) {
                var ePosDev = new epson.ePOSDevice();
                //var ip = this.getView().byId("ipaddr").getValue();
                // var wdth = this.getView().byId("wdth").getValue();
                // var ht = this.getView().byId("heht").getValue();
                //printerIp = this.printerIP;

                for (let a = 0; a < canvasesArray.length; a++) {
                    const canvases = canvasesArray[a];
                    await new Promise((resolve, reject) => {
                        ePosDev.connect(printerIp, 8043, function (resultConnect) {
                            if (resultConnect === "OK" || resultConnect == "SSL_CONNECT_OK") {
                                ePosDev.createDevice("local_printer", ePosDev.DEVICE_TYPE_PRINTER,
                                    { crypto: false, buffer: false },
                                    async function (deviceObj, resultCreate) {
                                        if (resultCreate === "OK") {
                                            var printer = deviceObj;



                                            printer.brightness = 1.0;
                                            printer.halftone = printer.HALFTONE_ERROR_DIFFUSION;
                                            for (const canvas of canvases) {
                                                printer.addImage(canvas.getContext("2d", { willReadFrequently: true }), 0, 0, canvas.width, canvas.height, printer.COLOR_1, printer.MODE_MONO);
                                            }


                                            printer.addCut(printer.CUT_FEED);
                                            await printer.send();
                                            resolve();
                                            if (canvasesArray.length === a - 1) {
                                                window.location.reload(true);
                                            }
                                            // printer.send(function (resultSend) {
                                            //     if (resultSend === "OK") {
                                            //         sap.m.MessageToast.show("Printed successfully!");
                                            //     } else {
                                            //         sap.m.MessageBox.error("Print failed: " + resultSend);
                                            //     }
                                            // });
                                        } else {
                                            sap.m.MessageBox.error("Failed to create device: " + resultCreate);
                                            reject(resultCreate);
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
                    });
                }

            },
            showIPAdrress: function(){
              sap.ui.getCore().byId("printbtn").setEnabled(true);
              this.onOpenPrinterDialog();
            },
             onOpenPrinterDialog: function () {
                var that = this;

                // 1️⃣ Filter out blank IP addresses
                var aValidIPs = (that.printerIP || []).filter(function (ip) {
                    return ip && ip.trim() !== "";
                });

                if (aValidIPs.length === 0) {
                    sap.m.MessageToast.show("No valid printer IPs found.");
                    return;
                }

                // 2️⃣ Create JSON Model for GridList
                var oIPModel = new sap.ui.model.json.JSONModel({
                    IPs: aValidIPs.map(function (ip) {
                        return { IP: ip };
                    })
                });
                var ipBox = sap.ui.getCore().byId("ipBox");
                ipBox.setVisible(false);
                this._oPrintDialog.setModel(oIPModel, "IPModel");

                this.printIP = aValidIPs[0];
                this.onPressIP();

            },
            onPressIP: function (oEvent) {
                // var that = this;
                // var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
                // var oVBox = oItem.getContent ? oItem.getContent()[0] : oItem.getAggregation("content")[0];
                // var aItems = oVBox.getItems ? oVBox.getItems() : oVBox.getAggregation("items");
                // this.printIP = aItems[0]?.getText();
                this.onConfirmPrint();
                //this.sendToEpsonPrinter(this.aCanvas, this.printIP);
                


            },
                        _initCanvasWithFixes: function () {
                // Call old inits first (keeps everything as-is)
                if (this._initializeCanvas1) {
                    this._initializeCanvas1();
                }
                if (this._initializeCanvas2) {
                    this._initializeCanvas2();
                }

                // Now add DPI/offset fixes to both canvases
                const canvasIds = ["signatureCanvas", "signatureCanvas1"];
                canvasIds.forEach(canvasId => {
                    const oCanvasControl = sap.ui.core.Fragment.byId("SignaturePad", canvasId);
                    if (!oCanvasControl) return;

                    const canvas = oCanvasControl.getDomRef();
                    if (!canvas || !canvas.getContext) return;

                    // Get displayed size
                    const rect = canvas.getBoundingClientRect();
                    const cssWidth = rect.width || 450;
                    const cssHeight = rect.height || 200;

                    // DPI scaling (reuse your existing getPixelRatio)
                    const dpr = this.getPixelRatio() || 1;
                    if (dpr > 1) {  // Only if needed
                        canvas.width = cssWidth * dpr;
                        canvas.height = cssHeight * dpr;
                        canvas.style.width = cssWidth + 'px';
                        canvas.style.height = cssHeight + 'px';

                        const ctx = canvas.getContext("2d");
                        ctx.scale(dpr, dpr);  // Fix drawing scale
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 2;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                    }

                    // Override the position function additively (monkey-patch the old getEventPosition)
                    if (!canvas._fixedGetEventPosition) {  // Avoid re-patching
                        canvas._fixedGetEventPosition = (e) => {
                            const canvasRect = canvas.getBoundingClientRect();
                            let clientX, clientY;
                            if (e.touches && e.touches.length > 0) {
                                clientX = e.touches[0].clientX;
                                clientY = e.touches[0].clientY;
                            } else {
                                clientX = e.clientX;
                                clientY = e.clientY;
                            }
                            // Key: Scale to match canvas resolution (fixes offset)
                            const x = (clientX - canvasRect.left) * (canvas.width / canvasRect.width);
                            const y = (clientY - canvasRect.top) * (canvas.height / canvasRect.height);
                            console.log(`Fixed position for ${canvasId}: x=${x.toFixed(0)}, y=${y.toFixed(0)} (DPR=${dpr})`);
                            return { x, y };
                        };
                        canvas._fixedGetEventPosition.fixed = true;  // Flag it
                    }
                });

                // Optional: Patch clears for scaled canvases (uncomment if needed)
                // this._patchedClearSignature = function() { ... } // See below if you want
            },
            _fixSignatureOffset: function () {
                const dpr = this.getPixelRatio() || 1;
                if (dpr === 1) return;

                console.log(`Safe final fix: correct scaling + thin smooth line (dpr = ${dpr})`);

                ["signatureCanvas", "signatureCanvas1"].forEach(canvasId => {
                    const oCanvasControl = sap.ui.core.Fragment.byId("SignaturePad", canvasId);
                    if (!oCanvasControl || !oCanvasControl.getDomRef()) return;

                    const canvas = oCanvasControl.getDomRef();
                    const ctx = canvas.getContext("2d");

                    // Re-apply scaling
                    const rect = canvas.getBoundingClientRect();
                    canvas.width = rect.width * dpr;
                    canvas.height = rect.height * dpr;
                    ctx.scale(dpr, dpr);
                    // Clear old drawing
                    ctx.clearRect(0, 0, rect.width, rect.height);

                    // Force thin, smooth, single line style (overrides old)
                    ctx.lineWidth = 1.0;  // Thin natural line (try 1.2 for thinner)
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.strokeStyle = "#000000";
                    ctx.miterLimit = 1;  // Prevents sharp corners

                    console.log(`Safe style fix applied to ${canvasId}`);
                });
            }

        });
    });
