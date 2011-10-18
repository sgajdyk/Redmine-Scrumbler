var ScrumblerDashboard = (function() {
    $from = function(v) {
        return function() {
            return v
        }
    };

    var ISSUE_TEMPLATE = new Template(
        "<div class='scrumbler_dashboard_issue_heading' >\n\
            <div class='scrumbler_dashboard_issue_color' style='background: ##{color};'>&nbsp;\n\
                <a href='#{tracker_url}'>#{tracker_name}</a>\n\
                <div class='scrumbler_dashboard_issue_id'>\n\
                    <a href='#{issue_url}'>##{issue_id}</a>\n\
                </div>\n\
            </div>\n\
        </div>\n\
        <div class='scrumbler_issue_body'>\n\
            <a href='#{issue_url}'>#{issue_subject}</a>\n\
        </div>");

    var Issue = Class.create({
        initialize: function(sprint, config, statuses, trackers, url, css_class) {
            // -
            // private
            var id = "scrumbler_dashboard_issue_" + config.id;
            var issue_url = '/issues/'+config.id;
            var tracker_url = url+'/issues?tracker_id='+config.tracker_id;
            var sprint_url = url+'/scrumbler_sprints/'+sprint.id+'/issue/'+config.id;
            var row = new Element('tr', {
                'class' : css_class
            });
            var issueEl = new Element('div', {
                'class': 'scrumbler_dashboard_issue',
                id: id
            });
                
            function makeStatusElements() {
                var statusElements = {};
                var i = 0;
                statuses.each(function(status){
                    statusElements[status.issue_status_id] = {
                        element: new Element('td'),
                        position: i++,
                        status: status
                    };
                    statusElements[status.issue_status_id].element.scrumbler_status = status;
                })
                return $H(statusElements); 
            };
                
                
            // +
            // public
            this.getID          = $from(id);
            this.getRow         = $from(row);
            this.getIssueEl     = $from(issueEl);
            this.getConfig      = $from(config);
            this.getURL         = $from(sprint_url);
            this.getIssueURL    = $from(issue_url);
            this.getTrackerURL  = $from(tracker_url);
            this.getTrackers    = $from(trackers);
            
            this.status_id      = config.status_id;
            
            this.statuses = makeStatusElements(statuses);
          
            this.render();

            this.makeInteractive();


        },
        getSortedStatuses: function() {
            return this.statuses.values().sort(function(a, b) {
                return a.position - b.position
            });
        },
        render: function() {
            var color = '507AAA';
            if(this.getTrackers()[this.getConfig().tracker_id].settings) {
                color = this.getTrackers()[this.getConfig().tracker_id].settings.color
            }
            this.getIssueEl().update(ISSUE_TEMPLATE.evaluate({
                issue_url: this.getIssueURL(),
                tracker_url: this.getTrackerURL(),
                tracker_name: this.getTrackers()[this.getConfig().tracker_id].name,
                issue_subject: this.getConfig().subject,
                issue_id: this.getConfig().id,
                //description: this.getConfig().description, 
                color: color
            }));

            // Draw statuses
            this.getSortedStatuses().each(function(status) {
                this.getRow().appendChild(status.element);
                status.element.update('&nbsp;')
            }, this);
            this.statuses.get(this.getConfig().status_id).element.appendChild(this.getIssueEl());
        },
        makeInteractive: function() {
            // -
            // private
            var issue = this;
            var draggable = new Draggable(this.getIssueEl(), {
                revert : true,
                constraint: 'horizontal'
            });
                
            function makeDroppableEl (status) {
                function onDrop(dragEl, dropEl, event) {
                    if((dragEl != issue.getIssueEl()) || 
                        !dropEl.scrumbler_status) return;
                    
                    var status = dropEl.scrumbler_status;
                    
                    if(issue.status_id != status.issue_status_id) {
                        issue.getIssueEl().hide();
                        new Ajax.Request(issue.getURL(),
                        {
                            method:'post',
                            parameters: {
                                'issue[status_id]': status.issue_status_id
                            },
                            onSuccess: function(transport){
                                var resp = transport.responseJSON;
                                if(!resp) return;

                                if(resp.success) {
                                    issue.status_id = status.issue_status_id;
                                    dropEl.appendChild(issue.getIssueEl());
                                } else {
                                    $growler.growl(resp.text, {
                                        header: 'Ошибка'
                                    });
                                }
                                
                            },
                            onFailure: function(){ 
                                alert('Something went wrong...') 
                            },
                            onComplete: function() {
                                issue.getIssueEl().show()
                            }
                        });
                        
                    }
                        
                        
                }
                    
                Droppables.add(status, {
                    accept: 'scrumbler_dashboard_issue',
                    onDrop: onDrop
                });
            };
                
            // Create droppables
            this.statuses.each(function(pair) {
                makeDroppableEl(pair.value.element);
            });
        }
    });


    
    var Dashboard = Class.create({
        initialize: function(dashboard, config) {
            // -
            // private
            function makeIssues(config) {
                var issues = [];
                var css_class = ['odd','even'];
                var css_selector = 0;
                config.issues.each(function(issue) {
                    if(css_selector==0)
                        css_selector = 1
                    else
                        css_selector = 0
                    issues.push(new Issue(config.sprint , issue, config.statuses, config.trackers, config.url, css_class[css_selector]));
                });
                return issues;
            }
            var table  = new Element('table', {
                'width': '100%',
                'class': 'list'
            }, {})
            var issues = makeIssues(config);
            
        
            // +
            // public
            this.getDashboard = $from($(dashboard));
            this.getConfig    = $from(config);
            this.getStatuses  = $from(config.statuses);
            this.getTrackers  = $from(config.trackers);
            this.getIssues    = $from(issues);
            this.getTable     = $from(table);
                
            this.render();
        },
        render: function() {
            // -
            // private
            var drawStatuses = function () {
                var tr = this.getTable().appendChild(new Element('tr'));
                var colWidth = 100/this.getStatuses().length;
                this.getStatuses().each(function(status){
                    var th = tr.appendChild(new Element('th', {
                        width: ''+colWidth+'%'
                    }));
                    th.update(status.name);
                }, this);
            }.bind(this)
            
            // +
            // public
            drawStatuses();
                
            // drawIssues
            this.getIssues().each(function(issue) {
                this.getTable().appendChild(issue.getRow())
            }, this)
                
            // Append table to dashboard
            this.getDashboard().appendChild(this.getTable());
        }
    });
    
    return Dashboard;
})();