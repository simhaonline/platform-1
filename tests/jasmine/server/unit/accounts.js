'use strict';
MeteorStubs.install();

describe("tests for deleting and counting user accounts", function() {

    beforeAll(function() {       
        MeteorStubs.install();
    });

    afterAll(function() {
        MeteorStubs.uninstall();
    });

    it("test Meteor.users.remove() is called when user IDs match", function() {
        spyOn(Meteor.users, 'remove').and.callThrough();
        var thisContext = {userId: 1};
        Meteor.methodMap.deleteAccount.call(thisContext, 1);
        expect(Meteor.users.remove.calls.count()).toBe(1);
    });    
});
