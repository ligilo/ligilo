/**
 * Manager used to populate and manage SaaS features.
 */
define(['cascade'], function ($cascade) {
	var current = {

		initialize: function () {
			// Load global tools
			var globalTools = current.$session.userSettings.globalTools || [];
			current.$view.find('.global-configuration').remove();
			for (var index = 0; index < globalTools.length; index++) {
				current.renderGlobal(globalTools[index]);
			}
		},

		/**
		 * Render the global for the given tool configuration.
		 * @param  {object} globalTool Global tool configuration.
		 */
		renderGlobal: function (globalTool) {
			current.requireTool(current, globalTool.node.id, function ($tool) {
				var $global = ($tool.$view.is('.global-configuration') ? $tool.$view : $tool.$view.find('.global-configuration')).clone();
				$tool.renderGlobal($global, globalTool);
				$global.removeClass('hidden hide');
			});
		},

		/**
		 * Return the root of refinement. This corresponds to the basic service. The result will be cached.
		 */
		getServiceFromNode: function (node) {
			if (node.service) {
				return node.service;
			}
			node.service = (node.refined && this.getServiceFromNode(node.refined)) || node;
			return node.service;
		},

		/**
		 * Return the first level of refinement, just after root. This corresponds to the first implementation
		 * of a service. The result will be
		 * cached.
		 */
		getTool: function (node) {
			if (node.tool) {
				return node.tool;
			}
			if (node.refined) {
				if (node.refined.refined === undefined || node.refined.refined === null) {
					node.tool = node;
				} else {
					node.tool = this.getTool(node.refined);
				}
			} else {
				return null;
			}
			return node.tool;
		},

		/**
		 * Load dependencies of given node identifier, and call given callback when :
		 * <ul>
		 * <li>HTML is integrated inside the current view if was not</li>
		 * <li>CSS is loaded and loaded</li>
		 * <li>JavaScript is loaded, injected and initialized</li>
		 * </ul>
		 * @param {object} context Context requesting this service.
		 * @param node Node identifier to prepare dependencies.
		 * @param callback Optional function to call when all dependencies are loaded and initialized.
		 * Parameter will be the controller of the service.
		 */
		requireService: function (context, node, callback) {
			var service = current.getServiceNameFromId(node);
			$cascade.loadFragment(context, context.$transaction, 'main/plugin/' + service + '/', service, {
				callback: callback,
				plugins: ['css', 'i18n', 'partial', 'js']
			});
		},

		/**
		 * Load dependencies of given node identifier, and call given callback when :
		 * <ul>
		 * <li>HTML is integrated inside the service's view if was not</li>
		 * <li>CSS is loaded and loaded</li>
		 * <li>JavaScript is loaded, injected and initialized</li>
		 * <li>All above dependencies for service and for tool, and in this order</li>
		 * </ul>
		 * @param {object} context Context requesting this service.
		 * @param node Node identifier to prepare dependencies.
		 * @param callback Optional function to call when all dependencies are loaded and initialized.
		 * Parameter will be the controller of the tool.
		 */
		requireTool: function (context, node, callback) {
			// First, load service dependencies
			var transaction = context.$transaction;
			current.requireService(context, node, function ($current) {
				// Then, load tool dependencies
				var service = current.getServiceNameFromId(node);
				var tool = current.getToolNameFromId(node);
				$cascade.loadFragment($current, transaction, 'main/plugin/' + service + '/' + tool, tool, {
					callback: callback,
					plugins: ['css', 'i18n', 'partial', 'js']
				});
			});
		},

		/**
		 * Return the tool identifier part from a node identifier. It's the first level of refinement, just
		 * after service. This corresponds to the first implementation of a service.
		 */
		getToolFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			var data = id.split(':');
			return data.length > 2 && data.slice(0, 3).join('-');
		},

		/**
		 * Return the identifier of each hierarchy nodes until the service.
		 */
		getHierarchyId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			var data = id.split(':');
			var index;
			var result = '';
			for (index = 2; index <= data.length; index++) {
				result += ' ' + data.slice(0, index).join('-');
			}
			return result;
		},

		/**
		 * Return the service identifier part from a node identifier.
		 */
		getServiceFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			var data = id.split(':');
			return data.length > 1 && data.slice(0, 2).join('-');
		},

		/**
		 * Return the service simple name part from a node identifier.
		 */
		getServiceNameFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			return id.split(':')[1];
		},

		/**
		 * Return the service simple name part from a node identifier.
		 */
		getToolNameFromId: function (id) {
			// Pattern is : service:{service name}:{tool name}(:whatever)
			return id.split(':')[2];
		},

		/**
		 * Icon of corresponding tool, and entity's "name".
		 */
		toIconNameTool: function (node) {
			return current.toIcon(node) + '<span class="hidden-xs"' + (node.description ? ' title="' + node.description + '"' : '') + '>' + node.name + '</span>';
		},

		toToolBaseIcon: function (node) {
			var fragments = node.split(':');
			return 'main/plugin/' + fragments[1] + '/' + fragments[2] + '/img/' + fragments[2];
		},

		/**
		 * Icon of corresponding tool.
		 */
		toIcon: function (node, suffix, dataSrc) {
			return current.$main.toIcon(node, suffix, dataSrc);
		},

		/**
		 * Return the "name" of the given entity
		 */
		toName: function (object) {
			return object.name;
		},

		/**
		 * Return the given entity
		 */
		toIdentity: function (object) {
			return object;
		},

		/**
		 * Return the "text" of the given entity
		 */
		toText: function (object) {
			return object.text;
		},

		/**
		 * Return the "description" of the given entity
		 */
		toDescription: function (object) {
			return object.description;
		},

		/**
		 * Refresh the status of given subscription.
		 * @param subscription : Single or multiple subscription to detail.
		 */
		refreshSubscription: function (subscriptions, renderCallback) {
			if (!$.isArray(subscriptions)) {
				subscriptions = [subscriptions];
			}
			var subscriptionsAsMap = [];
			var ids = subscriptions.map(function (s) {
				subscriptionsAsMap[s.id] = s;
				return s.id;
			});
			$.ajax({
				dataType: 'json',
				url: REST_PATH + 'subscription/status/refresh?id=' + ids.join('&id='),
				type: 'GET',
				success: function (freshSubscriptions) {
					// Process each result
					ids.forEach(function (id) {
						// Copy fresh data
						var subscription = subscriptionsAsMap[id];
						var freshSubscription = freshSubscriptions[id];
						subscription.parameters = freshSubscription.parameters;
						subscription.data = freshSubscription.data;
						subscription.status = freshSubscription.status;

						// Update the UI
						current.updateSubscriptionStatus(subscription, renderCallback);
					});
				},
				beforeSend: function () {
					ids.forEach(function (id) {
						$('[data-subscription="' + id + '"]').find('.status').addClass('refresh');
					});
				},
				complete: function () {
					ids.forEach(function (id) {
						$('[data-subscription="' + id + '"]').find('.status.refresh').removeClass('refresh');
					});
				}
			});
		},

		/**
		 * refresh subscriptions status
		 */
		updateSubscriptionStatus: function (subscription, renderCallback) {
			// Check the transition to save useless computation
			if ($cascade.isSameTransaction(current)) {
				current.applySubscriptionStyle(null, subscription, true, renderCallback);
			}
		},

		/**
		 * apply subscriptions style
		 */
		applySubscriptionStyle: function ($tr, subscription, refresh, renderCallback) {
			var tdClass;
			var tooltip;
			var contentClass = '';
			var id = subscription.id;
			$tr = $tr || $('[data-subscription="' + id + '"]');
			if (subscription.status === 'up') {
				tdClass = 'status-up';
				tooltip = current.$messages['subscription-state-up'];
			} else if (subscription.status === 'down') {
				tdClass = 'status-down';
				tooltip = current.$messages['subscription-state-down'];
				contentClass = 'fa-chain-broken';
			} else {
				tdClass = 'status-unknown';
				tooltip = current.$messages['subscription-state-unknown'];
			}
			$tr.find('td.status').removeClass('status-up').removeClass('status-down').removeClass('status-unknown').addClass(tdClass).removeAttr('data-original-title').attr('data-title', tooltip).attr('data-container', 'body').attr('rel', 'tooltip').tooltip('fixTitle')[contentClass ? 'addClass' : 'removeClass']('text-danger').html(contentClass ? '<i class="fa ' + contentClass + '"></i>' : '&nbsp;');

			// Update fresh details & key
			if (refresh) {
				// Replace the original content with content based on live data
				current.updateSubscriptionDetails($tr, subscription, 'key', true, renderCallback);
				current.updateSubscriptionDetails($tr, subscription, 'features', false, renderCallback);
			}
		},

		updateSubscriptionDetails: function ($tr, subscription, filter, replace, renderCallback) {
			var $td = $tr.find('td.' + filter);

			// Build the container
			var $details;
			if (replace) {
				$details = $td;
			} else {
				$details = $td.find('.details');
				if ($details.length === 0) {
					$td.append('<span class="details"></span>');
					$details = $td.find('.details');
				}
			}

			// Build the content
			current.$child && current.requireTool(current.$child, subscription.node.id, function ($tool) {
				var newContent = subscription.status === 'up' && current.render(subscription, 'renderDetails' + filter.capitalize(), $tool);
				if (!$td.is('.rendered')) {
					// Add minimum data
					$cascade.removeSpin($td).addClass('rendered').prepend(((renderCallback && renderCallback(subscription, filter, $tool, $td)) || '') + current.render(subscription, 'render' + filter.capitalize(), $tool));
				}
				// Update the UI is managed
				$tool.$parent.configurerFeatures && $tool.$parent.configurerFeatures($td, subscription);
				$tool.configurerFeatures && $tool.configurerFeatures($td, subscription);

				if (newContent && newContent !== '&nbsp;') {
					// Add generated detailed data
					$details.empty().html(newContent).find('.carousel').carousel({interval: false});
					renderCallback && renderCallback(subscription, filter, $tool, $details);
				}
			});
		},

		/**
		 * Generate a FontAwesome icon. Provided class will be prefixed by "fa fa-". Tooltip is optional and
		 * will be resolved with messages if available.
		 */
		icon: function (faIcon, tooltip) {
			return '<i class="fa fa-' + faIcon + '"' + current.tooltip(tooltip) + '></i>&nbsp;';
		},

		/**
		 * Generate tooltip part.  Text will be resolved with messages if available. If empty, empty text is
		 * returned.
		 */
		tooltip: function (tooltip) {
			return tooltip ? ' data-container="#_ucDiv" data-toggle="tooltip" title="' + (current.$messages[tooltip] || tooltip) + '"' : '';
		},

		/**
		 * Namespace based dynamic call : tool and service specific.
		 */
		render: function (subscription, namespace, $tool) {
			var result = '';
			if (subscription.parameters) {
				// Render service
				if ($tool.$parent[namespace]) {
					result += $tool.$parent[namespace](subscription) || '';
				}

				// Render tool
				if ($tool[namespace]) {
					result += $tool[namespace](subscription) || '';
				}
			}
			return result.length ? result : '';
		},

		renderKey: function (subscription, parameter) {
			var value = current.getData(subscription, parameter);
			return value && (current.icon('key', current.$messages[parameter] || parameter) + value);
		},

		getData: function (subscription, parameter) {
			return subscription.parameters && subscription.parameters[parameter];
		},

		renderServicelink: function (icon, link, tooltipKey, textKey, attr) {
			return '<a href="' + link + '"' + (attr || '') + ' class="feature"><i class="fa fa-' + icon + '" data-toggle="tooltip"' + (tooltipKey ? ' title="' + current.$messages[tooltipKey] + '"' : '') + '></i> ' + (textKey ? current.$messages[textKey] : '') + '</a>';
		},

		renderServiceHelpLink: function (parameters, serviceKey) {
			var result = '';
			// Help
			if (parameters[serviceKey]) {
				result += current.renderServicelink('question-circle-o', parameters[serviceKey], 'service:help', undefined, 'target="_blank"');
			}
			return result;
		},

		/**
		 * Generate a carousel component based on given HTML items. Depending on the amount of subscriptions of same type, and the container, the behavior of the carousel may differ.
		 */
		generateCarousel: function (subscription, items, startIndex) {
			var i;
			var item;
			var id = 'subscription-details-' + subscription.id;
			var result = '<div id="' + id + '" class="carousel"';
			var groupBySubscription = subscription.node && (typeof subscription.node.subscriptions !== 'undefined');

			// Too much carousel -> disable
			result += (groupBySubscription && subscription.node.subscriptions.length > 50) ? ' data-interval=""' : ' data-ride="carousel"';
			result += '> ';
			if (groupBySubscription) {
				// Carousel indicator is moved to header instead of each raw
				var $group = $('tr[data-subscription="' + subscription.id + '"]').closest('table.subscriptions').find('.group-carousel');
				if ($group.length && !$group.has('.carousel-indicators').length) {
					// Add a global carousel indicator for this table
					$group.append(current.generateCarouselIndicators(items, null, startIndex));
				}
			} else {
				// This carousel is independent
				result += current.generateCarouselIndicators(items, id, startIndex);
			}
			result += '<div class="carousel-inner" role="listbox">';
			for (i = 0; i < items.length; i++) {
				item = items[i];
				result += '<div class="item item-' + i + ((startIndex ? i === startIndex : i === 0) ? ' active' : '') + '">' + current.toCarousselText($.isArray(item) ? item[1] : item) + '</div>';
			}
			result += '</div>';

			// Carousel navigation is not available in grouped mode
			if (!groupBySubscription) {
				result += '<a class="right carousel-control" data-target="#' + id + '" role="button" data-slide="next"><span class="fa fa-chevron-right" aria-hidden="true"></span><span class="sr-only">Next</span></a>';
			}
			result += '</div>';
			return result;
		},

		toCarousselText: function(item) {
			return typeof item === 'undefined' ? '?' : item;
		},

		/**
		 * Generate carousel indicators for given items. Each item can be either a raw string, either an array where first item is the tooltip key, and the second is the item text.
		 */
		generateCarouselIndicators: function (items, target, startIndex) {
			var result = '<ol class="carousel-indicators">';
			var item;
			var i;
			for (i = 0; i < items.length; i++) {
				item = items[i];
				result += '<li';
				if (target) {
					result += ' data-target="#' + target + '"';
				}
				result += ' data-slide-to="' + i + '"' + ((startIndex ? i === startIndex : i === 0) ? ' class="active"' : '') + ($.isArray(item) ? ' data-toggle="tooltip" data-container="body" title="' + (current.$messages[item[0]] || item[0]) + '"' : '') + '></li>';
			}
			result += '</ol>';
			return result;
		},

		roundPercent: function (percent) {
			return Number(Math.round(percent + 'e1') + 'e-1');
		}
	};
	return current;
});