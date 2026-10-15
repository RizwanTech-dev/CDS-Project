sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"author/test/integration/pages/AuthorsList.gen",
	"author/test/integration/pages/AuthorsObjectPage.gen"
], function (JourneyRunner, AuthorsListGenerated, AuthorsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('author') + '/test/flpSandbox.html#author-tile',
        pages: {
			onTheAuthorsListGenerated: AuthorsListGenerated,
			onTheAuthorsObjectPageGenerated: AuthorsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

