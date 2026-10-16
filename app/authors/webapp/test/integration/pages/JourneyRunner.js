sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/capproject/authors/test/integration/pages/AuthorsList",
	"com/capproject/authors/test/integration/pages/AuthorsObjectPage"
], function (JourneyRunner, AuthorsList, AuthorsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/capproject/authors') + '/test/flpSandbox.html#comcapprojectauthors-tile',
        pages: {
			onTheAuthorsList: AuthorsList,
			onTheAuthorsObjectPage: AuthorsObjectPage
        },
        async: true
    });

    return runner;
});

