import { Widget, WidgetOptions, WidgetState, WidgetProperties } from 'dojo-widgets/interfaces';
import { Column } from './models/createColumn';
import createColumns  from './models/createColumns';
import { Sort } from './models/createSort';
import createSortArray from './models/createSortArray';
import createWidgetBase from 'dojo-widgets/createWidgetBase';
import createHeader from './nodes/createHeader';
import createHeaderView from './nodes/createHeaderView';
import createHeaderCell from './nodes/createHeaderCell';
import createSortArrow from './nodes/createSortArrow';
import createHeaderCellView from './nodes/createHeaderCellView';
import createHeaderScroll from './nodes/createHeaderScroll';
import createBody from './nodes/createBody';
import createRow from './nodes/createRow';
import createRowView from './nodes/createRowView';
import createCell from './nodes/createCell';
import createCellView from './nodes/createCellView';
import { w, registry } from 'dojo-widgets/d';
import { getScrollbarSize } from './util';
import createDelegatingFactoryRegistryMixin from './mixins/createDelegatingFactoryRegistryMixin';
import { assign } from 'dojo-core/lang';

registry.define('dgrid-header', createHeader);
registry.define('dgrid-header-view', createHeaderView);
registry.define('dgrid-header-cell', createHeaderCell);
registry.define('dgrid-sort-arrow', createSortArrow);
registry.define('dgrid-header-cell-view', createHeaderCellView);
registry.define('dgrid-header-scroll', createHeaderScroll);
registry.define('dgrid-body', createBody);
registry.define('dgrid-row', createRow);
registry.define('dgrid-row-view', createRowView);
registry.define('dgrid-cell', createCell);
registry.define('dgrid-cell-view', createCellView);

export interface SortTarget extends HTMLElement {
	sortable: boolean;
	field: string;
	columnId: string;
	parentElement: SortTarget;
	getAttribute(name: 'field' | 'columnId'): string | null;
}

export interface SortEvent {
	event: (MouseEvent | KeyboardEvent);
	target: SortTarget;
}

export interface HasColumns {
	columns: Column[];
}

export interface HasColumn {
	column: Column;
}

export interface HasSort {
	sort?: Sort[];
}

export interface HasItem {
	item: any;
}

export interface HasItemIdentifier {
	itemIdentifier: string;
}

export interface HasSortEvent {
	onSortEvent: (event: SortEvent) => void;
}

export interface HasScrollbarSize {
	scrollbarSize: {
		width: number;
		height: number;
	};
}

export interface DgridState extends WidgetState, HasColumns, HasSort, HasScrollbarSize { }

export interface DgridProperties extends WidgetProperties, HasColumns, HasSort { }

export interface DgridOptions extends WidgetOptions<DgridState, DgridProperties> { }

function onSort(this: Widget<DgridProperties>, event: SortEvent) {
	const state = <DgridState> this.state;
	const sort = state.sort;

	const target = event.target;
	const field = (target.getAttribute('field') || target.getAttribute('columnId'));
	const currentSort = (sort && sort[0]);
	let newSort: Sort[] = [{
		property: field,
		descending: !!(currentSort && currentSort.property === field && !currentSort.descending)
	}];
	state.sort = createSortArray(newSort);
	this.invalidate();
}

const createDgrid = createWidgetBase
	.mixin(createDelegatingFactoryRegistryMixin)
	.mixin({
		mixin: {
			getHeaderProperties(): any {
				const {
					state,
					properties,
					registry
				} = this;

				return {
					registry,
					scrollbarSize: state.scrollbarSize,
					columns: properties.columns,
					sort: state.sort,
					onSortEvent: onSort.bind(this)
				};
			},
			getHeaderScrollProperties(): any {
				const {
					state,
					registry
				} = this;

				return {
					registry,
					scrollbarSize: state.scrollbarSize
				};
			},
			getBodyProperties(): any {
				const {
					state,
					properties,
					registry
				} = this;

				return {
					registry,
					columns: properties.columns,
					sort: state.sort,
					data: properties.data,
					idProperty: properties.idProperty
				};
			}
		}
	})
	.override(<DgridOptions> {
		tagName: 'div',
		classes: ['dgrid-widgets', 'dgrid', 'dgrid-grid'],
		nodeAttributes: [
			function () {
				return {
					role: 'grid'
				};
			}
		],
		diffProperties(previousProperties: DgridProperties, newProperties: DgridProperties): string[] {
			const changedPropertyKeys: string[] = [];
			// use createColumns to get a static representation of the columns for comparison
			newProperties.columns = createColumns(newProperties.columns);
			if (previousProperties.columns !== newProperties.columns) {
				changedPropertyKeys.push('columns');
			}
			// use createSortArray to get a static representation of the sort for comparison
			if (newProperties.sort) {
				newProperties.sort = createSortArray(newProperties.sort);
				if (previousProperties.sort !== newProperties.sort) {
					changedPropertyKeys.push('sort');
					this.state.sort = newProperties.sort;
				}
			}
			return changedPropertyKeys;
		},
		assignProperties(this: Widget<WidgetProperties>, previousProperties: WidgetProperties, newProperties: WidgetProperties): WidgetProperties {
			return assign({}, newProperties);
		},
		getChildrenNodes: function() {
			const {
				state
			} = this;
			if (!state.scrollbarSize) {
				state.scrollbarSize = getScrollbarSize(document.createElement('div'));
			}

			return [
				w('dgrid-header', this.getHeaderProperties()),
				w('dgrid-header-scroll', this.getHeaderScrollProperties()),
				w('dgrid-body', this.getBodyProperties())
			];
		}
	});

export default createDgrid;
