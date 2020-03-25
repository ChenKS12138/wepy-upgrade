const codeText = `({
  config : {
    navigationBarTitleText: "NJUPT"
    // enablePullDownRefresh: true
  },
  mixins : [ClassMixin, allSearch],
  components : {
    QyPopUp,
    BaseContainer
  },
  data : {
    moreFunc: {},
    courseColor: ["#6AD5E1", "#87E5DA", "#F7C562", "#FFB677", "#FF8364"],
    courses: [],
    noCourseItem: false,
    balance: "正在加载...",
    time: "",
    functionalList: "",
    swiperInfo: [],
    isNewInfo: false,
    runTime: "",
    loadHide: false,
    openPage: false,
    passTime: 5,
    schoolTalkText: "搜点什么吧~",
    // 是否检测到口令
    commandInfoStatus: false,
    // 是否有重要通知
    importantInfoStatus: false,
    // 重要通知
    importantInfo: {},
    // 社团信息
    assoInfo: {},
    showLaboratory: true,
    annualStatus: false, // 年报弹窗
    //开屏跳转
    navigatorTarget: "",
    navigatorAppId: "",
    navigatorUrl: "",
    displayPic: "",
    displayColor: "",
    avatarUrl: [
      "https://static.airbob.org/under-graduate/profile/avatar1.png",
      "https://static.airbob.org/under-graduate/profile/avatar2.png",
      "https://static.airbob.org/under-graduate/profile/avatar3.png"
    ],
    hiGraduateModal: false,
    graduateName: "",
    visitorModeStatus: false,
    classInfo: {},
    isRefreshYkt: false,
    courseToView: "course0"
  },
  computed : {
    isBalanceOk() {
      const exceptions = [
        "暂停服务",
        "密码需要更新",
        "请求失败",
        "正在加载...",
        "需要绑定一卡通"
      ];
      return !exceptions.includes(this.balance);
    }
  },
  // 首页广告
  watch : {
    openPage(newValue, oldValue) {
      if (newValue) {
        wepy.setNavigationBarColor({
          frontColor: "#ffffff",
          backgroundColor:
            this.displayColor || wepy.getStorageSync("display").displayColor,
          animation: {
            duration: 0,
            timingFunc: "easeIn"
          }
        });
        wepy.setNavigationBarTitle({
          title: ""
        });
        wepy.hideTabBar();
        let timer = setInterval(() => {
          this.passTime--;
          if (Number(this.passTime) <= 0) {
            clearInterval(timer);
            this.openPage = false;
            wepy.showTabBar();
            wepy.setNavigationBarColor({
              frontColor: "#000000",
              backgroundColor: "#fff",
              animation: {
                duration: 0,
                timingFunc: "easeIn"
              }
            });
            wepy.setNavigationBarTitle({
              title: "NJUPT"
            });
            this.$apply();
          }
          this.$apply();
        }, 1000);
      }
    },
    classInfo(newValue) {
      const { extraCourse, timetable, assign } = newValue;
      if (timetable) {
        const mergedCourse = extraCourse
          ? timetable.concat(extraCourse)
          : timetable;
        if (assign) {
          const { week, specialDayNum } = assign;
          this.dealCourse(mergedCourse, week, specialDayNum);
        } else {
          this.dealCourse(mergedCourse);
        }
        this.loadHide = true;
        this.$apply();
      }
    }
  },
  methods : {
    goSearch() {
      this.$navigate({
        url: "../others-page/pages/search"
      });
    },
    goInfobox() {
      this.$navigate({
        url: "../others-page/pages/information-box"
      });
    },
    // 首页广告
    passOpenPage() {
      this.openPage = false;
      wepy.setNavigationBarColor({
        frontColor: "#000000",
        backgroundColor: "#fff",
        animation: {
          duration: 0
        }
      });
      wepy.setNavigationBarTitle({
        title: "NJUPT"
      });
      wepy.showTabBar();
    },
    // 通过口令跳转到社团详情
    codeToDetail() {
      this.commandInfoStatus = false;
      this.$apply();
      wepy.setClipboardData({
        data: "剪贴板清空惹~"
      });
    },
    hideHiGraduate() {
      this.hiGraduateModal = false;
      wepy.setStorageSync("graduateModal", true);
    },
    closeCommandInfo() {
      this.commandInfoStatus = false;
    },
    async refreshYtkInfo() {
      const moduleStatus = wepy.getStorageSync("moduleStatus");
      const ytkModuleStatus = moduleStatus.find(x => x.moduleName === "一卡通");
      if (ytkModuleStatus && !ytkModuleStatus.open) {
        this.balance = "暂停服务";
        this.$apply();
      } else {
        this.isRefreshYkt = true;
        this.$apply();
        const { data: response } = await this.judgeCampusCard();
        this.isRefreshYkt = false;
        this.$apply();
        if (response.data) {
          const yktInfoCache = { data: response.data, time: new Date() };
          wepy.setStorageSync("yktInfo", yktInfoCache);
          const { data, time } = yktInfoCache;
          const tempDate = new Date(time);
          const formatTimeString = raw =>
            raw.toString().length < 2 ? "0" + raw.toString() : raw.toString();

          if (this.graduateIdentity) {
            this.balance =
              (Number(data.db_balance) + Number(data.unset_balance)) / 100;
          } else {
            this.balance =
              (Number(data.db_balance) + Number(data.unsettle_amount)) / 100;
          }
          this.$apply();
          wepy.setStorageSync("sno", data.sno);
        } else {
          if (response.errCode === 24) {
            this.balance = "密码需要更新";
          } else if (response.errCode === 34) {
            this.balance = "需要绑定一卡通";
          } else if (response.errCode === 668) {
            this.$parent.showTip(response.errMsg);
          } else {
            this.balance = "请求失败";
          }
          this.$apply();
        }
      }
    },
    prevent() {},
    async closeNotification(e) {
      const { id } = e.currentTarget.dataset;
      this.importantInfoStatus = false;
      const res = await setMessageRead(id);
      if (res.data && res.data.data) {
        this.swiperInfo = this.swiperInfo.filter(info => info.id !== id);
        this.$apply();
      }
    }
  },
  events : {
    changeAnnualStatus() {
      this.annualStatus = false;
    }
  },
  async getBalance() {
    let yktInfoCache = wepy.getStorageSync("yktInfo");
    if (!yktInfoCache) {
      const moduleStatus = wepy.getStorageSync("moduleStatus");
      const ytkModuleStatus = this.visitorModeStatus
        ? { open: true }
        : moduleStatus.find(x => x.moduleName === "一卡通");
      if (ytkModuleStatus && !ytkModuleStatus.open) {
        this.balance = "暂停服务";
        this.$apply();
      } else {
        const { data: response } = await this.judgeCampusCard();
        if (response.data) {
          yktInfoCache = { data: response.data, time: new Date() };
          wepy.setStorageSync("yktInfo", yktInfoCache);
        } else {
          if (response.errCode === 24) {
            this.balance = "密码需要更新";
          } else if (response.errCode === 34) {
            this.balance = "需要绑定一卡通";
          } else {
            this.balance = "请求失败";
          }
          this.$apply();
          return;
        }
      }
    }
    const { data, time } = yktInfoCache;
    const tempDate = new Date(time);
    const formatTimeString = raw =>
      raw.toString().length < 2 ? "0" + raw.toString() : raw.toString();

    if (this.graduateIdentity) {
      this.balance =
        (Number(data.db_balance) + Number(data.unset_balance)) / 100;
    } else {
      this.balance =
        (Number(data.db_balance) + Number(data.unsettle_amount)) / 100;
    }
    this.$apply();
    wepy.setStorageSync("sno", data.sno);
  },
  dealCourse(course, assignWeek = 0, assignDayNum = 0) {
    const now = new Date();
    let common = wepy.getStorageSync("common");
    let nowWeek =
      assignWeek !== 0
        ? assignWeek
        : this.visitorModeStatus
          ? 4
          : parseInt(common.week);
    let todayCourse = this.handleCourses(course, nowWeek);
    let today = assignDayNum !== 0 ? assignDayNum - 1 : now.getDay() - 1;
    today = today === -1 ? 6 : today;
    let allcourses = todayCourse[0][today];
    if (todayCourse[1][today].length >= 1) {
      allcourses.push(...todayCourse[1][today]);
    }
    let colorArr = this.courseColor;
    let nowCourses = [];
    for (let i in allcourses) {
      if (
        allcourses[i].weekarr.indexOf(nowWeek) !== -1 &&
        allcourses[i].weekarr.indexOf(nowWeek) !== "-1"
      ) {
        allcourses[i].time =
          "第" +
          allcourses[i].sectionstart +
          "-" +
          allcourses[i].sectionend +
          "节";
        allcourses[i].bgc = colorArr[i % 5];
        nowCourses.push(allcourses[i]);
      }
    }
    this.courses = nowCourses;
    if (this.courses.length >= 0) {
      this.courses.sort((a, b) => {
        return a.sectionstart - b.sectionstart;
      });
    }
    this.noCourseItem = this.courses.length === 0;
    this.loadHide = true;
    const allMinutes = now.getHours() * 60 + now.getMinutes();
    let courseIndex =
      [
        [8, 45],
        [9, 35],
        [10, 35],
        [11, 25],
        [12, 15],
        [14, 30],
        [15, 20],
        [16, 20],
        [17, 10],
        [19, 15],
        [20, 10],
        [21, 5]
      ].findIndex(x => x[0] * 60 + x[1] > allMinutes) + 1;
    if (courseIndex === 0) {
      courseIndex = 12;
    }
    let currentCourse =
      this.courses.findIndex(x => x.sectionend >= courseIndex) + 1;
    if (currentCourse === 0) {
      currentCourse = this.courses.length + 1;
    }
    for (let i = 0; i < currentCourse - 1; i++) {
      this.courses[i].bgc = "#D8D8D8";
    }
  },
  async moduleStatusJudge() {
    const moduleStatus = await getModuleStatus();
    const newModule = wepy.getStorageSync("newModule")
      ? wepy.getStorageSync("newModule")
      : [];
    if (moduleStatus.data) {
      const moduleStatusData = moduleStatus.data.data;
      if (wepy.getStorageSync("moduleStatus")) {
        const preModuleStatus = wepy.getStorageSync("moduleStatus");
        for (let i of moduleStatusData) {
          for (let j of preModuleStatus) {
            if (i.moduleName === j.moduleName) {
              if (
                i.isNew &&
                i.notificationHash !== j.notificationHash &&
                !newModule.includes(i)
              ) {
                newModule.push(i);
              }
            }
          }
        }
        if (newModule.length) {
          wepy.setStorageSync("newModule", newModule);
          for (let i of newModule) {
            for (let j of this.functionalList) {
              if (i.moduleName === j.name || j.name === "更多") {
                j.isNew = true;
              }
            }
          }
        }
      }
      wepy.setStorageSync("moduleStatus", moduleStatusData);
    }
  },

  async getHomeModules() {
    const modules = await getHomeModule();
    if (modules.data && modules.data.data) {
      const { allList, homeList } = modules.data.data;
      //  按priority降序排序并添加‘更多’
      this.functionalList = homeList
        ? homeList
            .sort((a, b) => b.priority - a.priority)
            .concat([this.$parent.globalData.moreFunc])
        : this.getDefaultHome();
      //  模块列表分类缓存
      const moduleList = this.getClassifyModules(allList);
      wepy.setStorageSync("moduleList", moduleList);
    } else {
      //  请求失败则取mixins
      this.functionalList = this.getDefaultHome();
      const moduleList = this.getClassifyModules();
      wepy.setStorageSync("moduleList", moduleList);
    }
    wepy.setStorageSync("indexIcon", this.functionalList);
    this.$apply();
  },

  async mockInit() {
    this.functionalList = this.getDefaultHome();
    wepy.setStorageSync("indexIcon", this.functionalList);
    this.getBalance();
    mockClassSchedule().then(res => {
      if (res.data) {
        wepy.setStorageSync("timetable", res.data.data);
        this.dealCourse(res.data.data);
        this.loadHide = true;
        this.$apply();
      }
    });
    mockGetNotification().then(res => {
      if (res.data) {
        const {
          data: { data: notificationList }
        } = res;
        this.swiperInfo = notificationList
          .filter(notification => {
            return !notification.read;
          })
          .sort((prev, next) => prev.createDate < next.createDate);
        if (this.swiperInfo.length > 0) {
          this.isNewInfo = true;
        }
        this.$apply();
      }
    });
    mockGetExercise().then(res => {
      if (res.data.data) {
        this.runTime = res.data.data.totalCount;
        this.$apply();
      }
    });
  },

  async init() {
    //  先让模块列表显示
    this.functionalList = this.getDefaultHome();
    wepy.setStorageSync("indexIcon", this.functionalList);
    const userInfoResponse = await getUserInfo();
    if (userInfoResponse.data) {
      await this.methods.judgeGraduateStatus(
        userInfoResponse.data.data.graduate
      );
      let userInfo = userInfoResponse.data.data;
      userInfo.nativeInformation.avatar = this.avatarUrl[
        Math.floor(Math.random() * 3)
      ];
      wepy.setStorageSync("User", userInfo);

      if (!wepy.getStorageSync("token") || !userInfo.enabled) {
        wepy.reLaunch({
          url: "/others-page/pages/login"
        });
      } else {
        //  获取首页模块
        await this.getHomeModules();
        // 获取消息
        getNotification().then(res => {
          if (res.data && res.data.data) {
            const {
              data: { data: notificationList }
            } = res;
            this.swiperInfo = notificationList
              .filter(notification => {
                return !notification.read;
              })
              .sort((prev, next) => prev.createDate < next.createDate);
            if (this.swiperInfo.length > 0) {
              //  判断未读消息中是否有重要通知
              const importantMsg = this.swiperInfo.find(msg => msg.type === 0);
              if (importantMsg) {
                this.importantInfoStatus = true;
                this.importantInfo = {
                  ...importantMsg,
                  content: importantMsg.content.trim().split("\n")
                };
              }
              this.isNewInfo = true;
            }
            this.$apply();
          }
        });
        this.moduleStatusJudge();
        runningCount().then(res => {
          if (res.data.data) {
            this.runTime = res.data.data.totalCount;
            this.$apply();
          }
        });
        commonInformation().then(common => {
          common.data && wepy.setStorageSync("common", common.data.data);
        });

        this.methods.judgeMemoryModeStatus().then(() => {
          this.checkGraduateMode(userInfo.name);

          this.getBalance();

          // 本科生走 if 里的逻辑
          if (!this.graduateIdentity) {
            classSchedule().then(timetable => {
              if (timetable.data && timetable.data.data) {
                const timetableData = timetable.data.data.timetable;
                wepy.setStorageSync("timetable", timetableData);
                this.classInfo.timetable = timetableData;
                this.$apply();
              }
            });
            getCourses().then(extraCourse => {
              if (extraCourse.data && extraCourse.data.data) {
                const extraCourseData = extraCourse.data.data.map(
                  item => item.courseModel
                );
                wepy.setStorageSync("extraCourse", extraCourseData);
                this.classInfo.extraCourse = extraCourseData;
                this.$apply();
              }
            });
            assignTimetable().then(assign => {
              if (assign.data && assign.data.data) {
                const {
                  semester,
                  specialDayNum,
                  week,
                  year
                } = assign.data.data;
                this.classInfo.assign = { week, specialDayNum };
              }
            });
            const userInfoCache = wepy.getStorageSync("userInfo");

            if (!userInfoCache || !userInfoCache.studentId) {
              educationSystemInformation().then(res => {
                if (res.data && res.data.data) {
                  wepy.setStorageSync("userInfo", res.data.data);
                }
              });
            }
          }
        });
      }
    }
  },

  /**
   * 检查毕业生身份相关逻辑
   */
  checkGraduateMode(name) {
    this.graduateName = name;
    if (this.graduateIdentity && !this.chooseMemoryMode) {

    }
    if (
      this.graduateIdentity &&
      this.chooseMemoryMode &&
      !wepy.getStorageSync("graduateModal")
    ) {
      this.hiGraduateModal = true;
    }
    if (this.graduateIdentity) {
      this.noCourseItem = true;
      this.loadHide = true;
    }
    this.$apply();
  },

  judgeCampusCard() {
    return this.visitorModeStatus
      ? mockCampusCardRequestInfo()
      : campusCardRequestInfo(this.geaduateIdentity);
  },
  async onShow() {
    // 获取上一个页面的路由
    const previousPageRouter = getCurrentPages()[0].__displayReporter
      .showReferpagepath;
    wepy.setNavigationBarColor({
      frontColor: "#000000",
      backgroundColor: "#fff",
      animation: {
        duration: 0
      }
    });
    wepy.setNavigationBarTitle({
      title: "NJUPT"
    });
    wepy.showTabBar();
    const token = wepy.getStorageSync("token");
    const userInfo = wepy.getStorageSync("User");
    if (!this.visitorModeStatus && userInfo) {
      if (token && userInfo && userInfo.enabled) {
        // 从特定页面回来再做对应处理
        switch (previousPageRouter) {
          //  刷新首页模块
          case "others-page/pages/more.html":
            this.functionalList = wepy.getStorageSync("indexIcon");
            if (!this.functionalList.some(item => item.name === "更多")) {
              this.functionalList.push(this.$parent.globalData.moreFunc);
              wepy.setStorageSync("indexIcon", this.functionalList);
            }
            await this.getHomeModules();
            break;

          // 刷新一卡通余额
          case "campus-card-page/pages/campus-card-index.html":
            this.getBalance();
            break;

          // 刷新消息盒子消息
          case "others-page/pages/information-box.html":
            getNotification().then(res => {
              if (res.data && res.data.data) {
                const {
                  data: { data: notificationList }
                } = res;
                this.swiperInfo = notificationList
                  .filter(notification => {
                    return !notification.read;
                  })
                  .sort((prev, next) => prev.createDate < next.createDate);
                if (this.swiperInfo.length > 0) {
                  this.isNewInfo = true;
                }
                this.$apply();
              }
            });
            break;

          // 读课表缓存
          case "edu-admin-page/pages/course.html":
            const timetable = wepy.getStorageSync("timetable");
            if (timetable) {
              this.loadWrong = false;
            }
            break;
        }

        // 判断口令
        const copyData = await wepy.getClipboardData();
        const filterStr = copyData.data.match(/€(.+?)€/g);
        if (filterStr !== null) {
          const filterCommand = filterStr[0].substring(
            1,
            filterStr[0].length - 1
          );
          if (this.assoInfo && filterCommand !== this.assoInfo.command) {
            associationDetail(filterCommand).then(res => {
              if (res.data.data) {
                this.commandInfoStatus = true;
                const { assoInfo, assoInfoDetails } = res.data.data;
                const associationItem = assoInfoDetails.find(x => x.type === 1);
                if (associationItem) {
                  const avatar = associationItem.picUrl;
                  this.assoInfo = {
                    avatar,
                    command: filterCommand,
                    info: assoInfo
                  };
                  this.commandInfoStatus = true;
                  this.$apply();
                }
              }
            });
          }
        }
      }
    }
  },
  /**
   * onLoad后主要是先判断是否为游客模式
   *  如果不是就同时获取开屏，资讯页信息，调用init
   */
  onLoad() {
    this.visitorModeStatus = this.$com.BaseContainer.visitorModeStatus;
    if (this.visitorModeStatus) {
      this.mockInit();
    } else {
      const token = wepy.getStorageSync("token");
      if (token) {
        // 首页开屏
        getDisplay().then(res => {
          const display = wepy.getStorageSync("display");
          if (res.data && res.data.data !== null) {
            const {
              displayId,
              color,
              picture,
              link,
              appId,
              type
            } = res.data.data;
            if (type === 0) {
              this.navigatorTarget = "miniProgram";
              this.navigatorAppId = appId;
            } else if (type === 1) {
              this.navigatorTarget = "self";
            } else if (type === 4) {
              this.navigatorTarget = "self";
              this.navigatorUrl = link;
            }
            let count = wepy.getStorageSync("openthePage") || 0;
            switch (true) {
              case displayId !== display.displayId:
                count = 0;
                wepy.setStorageSync("display", {
                  displayPic: picture,
                  displayColor: color,
                  displayId
                });
              case count < 5:
                this.openPage = true;
                this.displayPic = picture;
                this.displayColor = color;
                count++;
                wepy.setStorageSync("openthePage", count);
                break;
              default:
                break;
            }
            this.$apply();
          }
        });
        getPromotionInformation(1, 10).then(res => {
          const { success, data } = res.data;
          if (success) {
            if (data.totalAdCount !== wepy.getStorageSync("newsListSum")) {
              wepy.showTabBarRedDot({
                index: 1
              });
            }
          }
        });
      }
      this.init();
    }
  },
  // async onPullDownRefresh() {
  //   if (!this.openPage) {
  //     await this.init();
  //   }
  //   wepy.stopPullDownRefresh();
  // },
})
`;
/**
 * 选定指定成对花括号内的位置
 * @param {string} rawString
 * @param {number} skip
 */
const matchBracket = (rawString, skip = 0) => {
  const chars = rawString.split("");
  const left = chars.findIndex(
    (() => {
      let brackCount = 0;
      return char => {
        if (char === "{") {
          brackCount++;
        }
        if (brackCount <= skip) return false;
        return true;
      };
    })()
  );
  const right =
    chars.slice(left).findIndex(
      (() => {
        const bracketCount = { left: 0, right: 0 };
        return char => {
          if (char === "{") {
            bracketCount.left++;
            return;
          } else if (char === "}") {
            bracketCount.right++;
            return;
          }
          if (
            bracketCount.left === 0 ||
            bracketCount.right === 0 ||
            bracketCount.left !== bracketCount.right
          ) {
            return false;
          }
          return true;
        };
      })()
    ) + left;
  return { left, right };
};

/**
 * 清除js代码注释
 * @param {String} rawCodeString
 * @param {String}
 */
const removeCodeComments = rawCodeString => {
  return rawCodeString
    .replace(/\/\/.*?\n/g, "")
    .replace(/\/\*(.|\n)*?\*\//g, "");
};

const codeText2 = removeCodeComments(codeText).replace(/\r|\n|\s/g, "");
let bracketDeepth = 0;
let tempKeyString = "";
const resultObject = {};
const chars = codeText2.split("");
chars.forEach((char, index) => {
  if (["{", "["].includes(char)) {
    bracketDeepth++;
  }

  if (bracketDeepth === 1 && ![":", ",", "{", "}"].includes(char)) {
    tempKeyString += char;
  }
  if (bracketDeepth === 2) {
    if (char === "{") {
      const { left, right } = matchBracket(codeText2.substr(index));
      console.log(tempKeyString, codeText2.substr(index, right));
      tempKeyString = "";
    }
  }

  if (["}", "]"].includes(char)) {
    bracketDeepth--;
  }
});
