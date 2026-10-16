sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/core/Fragment',
	'sap/ui/base/Event',
	'sap/ui/model/json/JSONModel'

], function (ControllerExtension, Fragment, Event, JSONModel) {
	'use strict';


	return ControllerExtension.extend('com.capproject.authors.ext.controller.ObjectPageController', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf com.capproject.authors.ext.controller.ObjectPageController
			 */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
				this.getView().setModel(new JSONModel(), "booksDialogMdl");

				
			}
		},



		createBook: async function () {
			console.log("createBook");

			if (!this._oDialog) {
				this._oDialog = await Fragment.load({
					id: this.base.getView().getId(), // 🔥 VERY IMPORTANT
					name: "com.capproject.authors.ext.fragment.AddBooksAndChapters",
					controller: this
				});

				this.base.getView().addDependent(this._oDialog);
			}

			this._oDialog.open(); // ✅ correct reference
		},

		onSaveDialog: async function () {
			//Extention API
			const oExtAPI = this.base.getExtensionAPI();
			const oParentContext = oExtAPI.getBindingContext();
			const oView = this.base.getView();

			const oLocal = oView.getModel("booksDialogMdl").getData();
			const oBinding = oParentContext.getModel().bindList(
				oParentContext.getPath() + "/books"
			)
			try {
				var oContext = oBinding.create({
					title: oLocal.title,
					type: oLocal.type,
					cost: oLocal.cost,
					currency_code: oLocal.currency,
					// author_ID: sAuthorId        //oLocal.author_ID
				});

				await oContext.created(); // ✅ draft created
				sap.m.MessageToast.show("Book added to draft");
				// await oExtAPI.invokeActions("draftActivate", [oContext]);

				// sap.m.MessageToast.show("Book Created & Activated");

				this._oDialog.close();

				const oModel = this.base.getView().getModel();
				oModel.refresh();

				oExtAPI.refresh(); //UI Refresh
			} catch (e) {
				sap.m.MessageToast.show("Error");
				console.error(e);
			}
		},

		onCloseDialog: function () {
			this._oDialog.close(); // ✅ now works
			this.getView().getModel("booksDialogMdl").setData({});
		}
	});
});
