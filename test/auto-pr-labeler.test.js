const AutoPRLabeler = require("../lib/auto-pr-labeler");
const payload = require("./fixtures/payload");

describe("Auto-PR-Labeler", () => {
  const owner = "auto-pr-labeler";
  const repo = "app";

  /**
   * STATE
   */
  describe("STATE", () => {
    expect(AutoPRLabeler.STATE).toMatchObject({
      WIP: expect.any(String),
      UNREVIEWED: expect.any(String),
      APPROVED: expect.any(String),
      CHANGES_REQUESTED: expect.any(String),
      MERGED: expect.any(String)
    });
  }); // static STATE

  /**
   * GH_REVIEW_STATE
   */
  describe("GH REVIEW STATE", () => {
    expect(AutoPRLabeler.GH_REVIEW_STATE).toEqual({
      APPROVED: "APPROVED",
      CHANGES_REQUESTED: "CHANGES_REQUESTED"
    });
  }); // static GH_REVIEW_STATE

  /**
   * _getState
   */
  describe("_getState", () => {
    describe("when pull request title include WIP regex", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = () => klass._getState();

      test("should be STATE.WIP", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["wip_title"]["data"];
        const result = await subject();
        expect(result).toEqual(AutoPRLabeler.STATE.WIP);
      });
    });

    describe("when pull request merged", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = () => klass._getState();

      test("should be STATE.MERGED", async () => {
        klass.pullRequest = payload["pull_request"]["with"]["merged"]["data"];
        const result = await subject();
        expect(result).toEqual(AutoPRLabeler.STATE.MERGED);
      });
    });

    describe("when there are NO reviews", () => {
      const github = {
        pullRequests: {
          listReviews: jest.fn().mockReturnValue(Promise.resolve({}))
        }
      };
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = () => klass._getState();

      test("should be STATE.UNREVIED", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        const result = await subject();
        expect(result).toEqual(AutoPRLabeler.STATE.UNREVIED);
      });
    });

    describe("when number of CHANGES_REQUESTED is more than 0", () => {
      const github = {
        pullRequests: {
          listReviews: jest
            .fn()
            .mockReturnValue(
              Promise.resolve(
                payload["reviews"]["should_be"]["chnages_requested"]
              )
            )
        }
      };
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = () => klass._getState();

      test("should be STATE.CHANGES_REQUESTED", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        const result = await subject();
        expect(result).toEqual(AutoPRLabeler.STATE.CHANGES_REQUESTED);
      });
    });

    describe("when number of reviews and approved reviews are same", () => {
      const github = {
        pullRequests: {
          listReviews: jest
            .fn()
            .mockReturnValue(
              Promise.resolve(payload["reviews"]["should_be"]["approve"])
            )
        }
      };
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = () => klass._getState();

      test("should be STATE.APPROVE", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        const result = await subject();
        expect(result).toEqual(AutoPRLabeler.STATE.APPROVED);
      });
    });
  }); // _getState

  /**
   * _getUniqueReviews
   */
  describe("_getUniqueReviews", () => {
    describe("when there are reviews", () => {
      describe("and filtered by sha", () => {
        const github = {
          pullRequests: {
            listReviews: jest
              .fn()
              .mockReturnValue(
                Promise.resolve(payload["reviews"]["filtered_by"]["sha"])
              )
          }
        };
        const klass = new AutoPRLabeler(github, { owner, repo });
        const subject = () => klass._getUniqueReviews();
        const desiredObj = [
          { state: "CHANGES_REQUESTED", submitted_at: "2018-01-06T08:28:10Z" },
          { state: "CHANGES_REQUESTED", submitted_at: "2018-01-06T08:28:10Z" }
        ];

        test("should be head", async () => {
          klass.pullRequest =
            payload["pull_request"]["with"]["unreviewed_label"]["data"];
          const result = await subject();
          expect(result).toEqual(desiredObj);
        });
      });

      describe("and filtered by state", () => {
        const github = {
          pullRequests: {
            listReviews: jest
              .fn()
              .mockReturnValue(
                Promise.resolve(payload["reviews"]["filtered_by"]["state"])
              )
          }
        };
        const klass = new AutoPRLabeler(github, { owner, repo });
        const subject = () => klass._getUniqueReviews();
        const desiredObj = [
          { state: "APPROVED", submitted_at: "2018-01-06T08:28:10Z" }
        ];

        test("should be latest commit", async () => {
          klass.pullRequest =
            payload["pull_request"]["with"]["unreviewed_label"]["data"];
          const result = await subject();
          expect(result).toEqual(desiredObj);
        });
      });

      describe("and filtered by date", () => {
        const github = {
          pullRequests: {
            listReviews: jest
              .fn()
              .mockReturnValue(
                Promise.resolve(payload["reviews"]["filtered_by"]["date"])
              )
          }
        };
        const klass = new AutoPRLabeler(github, { owner, repo });
        const subject = () => klass._getUniqueReviews();
        const desiredObj = [
          { state: "APPROVED", submitted_at: "2020-07-24T00:00:00Z" }
        ];

        test("should be latest", async () => {
          klass.pullRequest =
            payload["pull_request"]["with"]["unreviewed_label"]["data"];
          const result = await subject();
          expect(result).toEqual(desiredObj);
        });
      });
    });

    describe("when there are NO reviews", () => {
      const github = {
        pullRequests: {
          listReviews: jest.fn().mockReturnValue(Promise.resolve({}))
        }
      };
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = () => klass._getUniqueReviews();

      test("should be empty Object", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        const result = await subject();
        expect(result).toEqual([]);
      });
    });
  }); // _getUniqueReviews

  /**
   * _ensurePRTriageLabelExists
   */
  describe("_ensurePRTriageLabelExists", () => {
    const klass = new AutoPRLabeler({}, { owner, repo });
    klass._createLabel = jest.fn().mockReturnValue(Promise.resolve({}));
    const n = 4;

    test(`createLabel() should be called ${n} times`, async () => {
      await klass._ensurePRTriageLabelExists();
      expect(klass._createLabel).toHaveBeenCalledTimes(n);
    });
  }); // _ensurePRTriageLabelExists

  /**
   * _createLabel
   */
  describe("_createLabel", () => {
    describe("when key exits", () => {
      // Mock GitHub API
      const github = {
        issues: {
          getLabel: jest.fn().mockReturnValue(Promise.resolve({})),
          createLabel: jest.fn().mockReturnValue(Promise.resolve({}))
        }
      };

      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = argument => klass._createLabel(argument);

      test("createLabel() should NOT be called", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        await subject(AutoPRLabeler.STATE.UNREVIED);
        expect(github.issues.createLabel).not.toHaveBeenCalled();
      });
    });

    describe("when key does not exist", () => {
      // Mock GitHub API
      const github = {
        issues: {
          getLabel: jest.fn().mockReturnValue(Promise.reject({})),
          createLabel: jest.fn().mockReturnValue(Promise.resolve({}))
        }
      };
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = argument => klass._createLabel(argument);

      test("hoge", async () => {
        await subject(AutoPRLabeler.STATE.UNREVIED);
        expect(github.issues.createLabel).toHaveBeenCalled();
      });
    });
  });

  /**
   * _addLabel
   */
  describe("_addLabel", () => {
    // Mock GitHub API
    let github = {
      issues: {
        addLabels: jest.fn().mockReturnValue(Promise.resolve({}))
      }
    };

    describe("when key exists", () => {
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = argument => klass._addLabel(argument);

      test("addLabels() should not be called", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        await subject(AutoPRLabeler.STATE.UNREVIED);
        expect(github.issues.addLabels).not.toHaveBeenCalled();
      });
    });

    describe("when key does NOT exist", () => {
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = argument => klass._addLabel(argument);

      test("addLabels() should be called", async () => {
        klass.pullRequest.labels = [];
        await subject(AutoPRLabeler.STATE.UNREVIED);
        expect(github.issues.addLabels).toHaveBeenCalled();
      });
    });
  }); // _addLabel

  /**
   * _removeLabel
   */
  describe("_removeLabel", () => {
    describe("when key does NOT exist", () => {
      // Mock GitHub API
      const github = {
        issues: {
          removeLabel: jest.fn().mockReturnValue(Promise.resolve({}))
        }
      };
      const klass = new AutoPRLabeler(github, { owner, repo });
      const subject = argument => klass._removeLabel(argument);

      test("should NOT call removeLabel() ", async () => {
        klass.pullRequest.labels = [];
        await subject(AutoPRLabeler.STATE.UNREVIED);
        expect(github.issues.removeLabel).not.toHaveBeenCalled();
      });
    });

    describe("when key exists", () => {
      describe("and removalLabel() resolve", () => {
        // Mock GitHub API
        const github = {
          issues: {
            removeLabel: jest.fn().mockReturnValue(Promise.resolve({}))
          }
        };
        const klass = new AutoPRLabeler(github, { owner, repo });
        const subject = argument => klass._removeLabel(argument);

        test("should call removeLabel()", async () => {
          klass.pullRequest =
            payload["pull_request"]["with"]["unreviewed_label"]["data"];
          await subject(AutoPRLabeler.STATE.UNREVIED);
          expect(github.issues.removeLabel).toHaveBeenCalled();
        });
      });

      describe("but removalLabel() rejects", () => {
        // Mock GitHub API
        const statusCode = 500;
        const github = {
          issues: {
            removeLabel: jest.fn().mockReturnValue(
              Promise.reject({
                code: statusCode
              })
            )
          }
        };
        const klass = new AutoPRLabeler(github, { owner, repo });
        const subject = argument => klass._removeLabel(argument);
        test("shoud throw an error", async () => {
          klass.pullRequest =
            payload["pull_request"]["with"]["unreviewed_label"]["data"];

          await expect(subject(AutoPRLabeler.STATE.UNREVIED)).rejects.toEqual({
            code: statusCode
          });
        });
      });
    });
  }); // _removeLabel

  /**
   * _updateLabel
   */
  describe("_updateLabel", () => {
    describe("when currentLabelKey exists", () => {
      describe("and argument is PRTriage.STATE.WIP", () => {
        const klass = new AutoPRLabeler({}, { owner, repo });
        const subject = argument => klass._updateLabel(argument);
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        klass._addLabel = jest.fn().mockReturnValue(Promise.resolve({}));
        klass._removeLabel = jest.fn().mockReturnValue(Promise.resolve({}));

        test("should call _addLabel() ", async () => {
          await subject(AutoPRLabeler.STATE.WIP);
          expect(klass._addLabel).not.toHaveBeenCalled();
        });

        test("should call _removeLabel()", async () => {
          await subject(AutoPRLabeler.STATE.WIP);
          expect(klass._removeLabel).toHaveBeenCalled();
        });
      });

      describe("and argument and current are different", () => {
        const klass = new AutoPRLabeler({}, { owner, repo });
        const subject = argument => klass._updateLabel(argument);
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        klass._addLabel = jest.fn().mockReturnValue(Promise.resolve({}));
        klass._removeLabel = jest.fn().mockReturnValue(Promise.resolve({}));

        test("should call _addLabel() ", async () => {
          await subject(AutoPRLabeler.STATE.APPROVE);
          expect(klass._addLabel).toHaveBeenCalled();
        });

        test("should call _removeLabel()", async () => {
          await subject(AutoPRLabeler.STATE.APPROVE);
          expect(klass._removeLabel).toHaveBeenCalled();
        });
      });

      describe("and argument and current are same", () => {
        const klass = new AutoPRLabeler({}, { owner, repo });
        const subject = argument => klass._updateLabel(argument);
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        klass._addLabel = jest.fn().mockReturnValue(Promise.resolve({}));
        klass._removeLabel = jest.fn().mockReturnValue(Promise.resolve({}));

        test("should not call _addLabel() ", async () => {
          await subject(AutoPRLabeler.STATE.UNREVIED);
          expect(klass._addLabel).not.toHaveBeenCalled();
        });

        test("should not call _removeLabel()", async () => {
          await subject(AutoPRLabeler.STATE.UNREVIED);
          expect(klass._removeLabel).not.toHaveBeenCalled();
        });
      });
    });

    describe("when currentLabelKey does NOT exist", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = argument => klass._updateLabel(argument);

      test("should call _addLabel()", async () => {
        klass.pullRequest.labels = [];
        klass._addLabel = jest.fn().mockReturnValue(Promise.resolve({}));
        await subject(AutoPRLabeler.STATE.UNREVIED);
        expect(klass._addLabel).toHaveBeenCalled();
      });
    });
  });

  /**
   * _getLabel
   */
  describe("_getLabel", () => {
    describe("when key exists", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = argument => klass._getLabel(argument);
      const desiredObj = { color: "fbca04", name: "PR: unreviewed" };

      test("should be a label object", async () => {
        klass.pullRequest =
          payload["pull_request"]["with"]["unreviewed_label"]["data"];
        await expect(subject(AutoPRLabeler.STATE.UNREVIED)).resolves.toEqual(
          desiredObj
        );
      });
    });

    describe("when key does NOT exist", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = argument => klass._getLabel(argument);

      test('should be new Error("Not found")', async () => {
        klass.pullRequest.labels = [];
        await expect(subject("hoge")).rejects.toThrow("Not found");
      });
    });
  }); // _getLabel

  /**
   * _getCurrentLabelKey
   */
  describe("_getCurrentLabelKey", () => {
    const klass = new AutoPRLabeler({}, { owner, repo });
    const subject = () => klass._getCurrentLabelKey();
    const desiredStr = AutoPRLabeler.STATE.UNREVIED;

    test(`should be ${desiredStr}`, () => {
      klass.pullRequest =
        payload["pull_request"]["with"]["unreviewed_label"]["data"];
      expect(subject()).toEqual(desiredStr);
    });
  });

  /**
   * _getFilteredConfigObjByRegex
   */
  describe("_getFilteredConfigObjByRegex", () => {
    describe("when pattern matches", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = argument => klass._getFilteredConfigObjByRegex(argument);

      test("should be filtered Object", () => {
        expect(subject(/label*/)).toMatchObject({
          labelUnreviewed: expect.any(Object),
          labelApproved: expect.any(Object),
          labelChangesRequested: expect.any(Object)
        });
      });
    });

    describe("when no pattern matches", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = argument => klass._getFilteredConfigObjByRegex(argument);

      test("should be empty Object", () => {
        expect(subject(/fake*/)).toEqual({});
      });
    });
  }); // _getFilteredConfigByRegex

  /**
   * _getConfigObj
   */
  describe("_getConfigObj", () => {
    describe("when key exists", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = argument => klass._getConfigObj(argument);
      const desiredObj = { color: "fbca04", name: "PR: unreviewed" };

      test("should be desiredObj", () => {
        expect(subject(AutoPRLabeler.STATE.UNREVIED)).toEqual(desiredObj);
      });

      test("should NOT be undefined", () => {
        expect(subject(AutoPRLabeler.STATE.UNREVIED)).not.toBeUndefined();
      });
    });

    describe("when key does NOT exist", () => {
      const klass = new AutoPRLabeler({}, { owner, repo });
      const subject = argument => klass._getConfigObj(argument);

      test("should be undefined", () => {
        expect(subject("fake")).toBeUndefined();
      });
    });
  }); // _getConfigObj
});
