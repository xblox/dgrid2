import { Widget, WidgetOptions, WidgetState, WidgetProperties } from 'dojo-widgets/interfaces';
import { HasSort, DgridProperties } from '../createDgrid';
import createSort from 'dojo-stores/query/createSort';
import { DgridBodyFactory } from '../nodes/createBody';
import { DgridCellFactory } from '../nodes/createCell';
import { DgridRowFactory } from '../nodes/createRow';
import { DgridRowViewFactory } from '../nodes/createRowView';
import { ComposeFactory } from 'dojo-compose/compose';
import { QueryStore } from 'dojo-stores/store/mixins/createQueryTransformMixin';
import { ObservableStore } from 'dojo-stores/store/mixins/createObservableStoreMixin';
import { QueryTransformResult } from 'dojo-stores/store/createQueryTransformResult';

export interface HasCollection {
	collection?: QueryStore<any, ObservableStore<any, any, any>> | QueryTransformResult<any, ObservableStore<any, any, any>>;
}

export interface StoreMixinFactory extends ComposeFactory<Widget<WidgetProperties & HasCollection>, WidgetOptions<WidgetState, WidgetProperties & HasCollection>> {}

const storeMixin: StoreMixinFactory = <any> {
	aspectAdvice: {
		around: {
			diffProperties(diffProperties: () => string[]) {
				// add collection check (by reference) to dgrid-body
				return function(previousProperties: HasCollection, newProperties: HasCollection) {
					const changedPropertyKeys = diffProperties.apply(this, arguments);
					if (previousProperties.collection !== newProperties.collection) {
						changedPropertyKeys.push('collection');
					}
					return changedPropertyKeys;
				};
			}
		},
		after: {
			getBodyProperties(properties: any) {
				properties.collection = this.properties.collection;
				return properties;
			}
		}
	},
	initialize(instance: Widget<DgridProperties>) {
		const registry = instance.registry;

		const body: DgridBodyFactory = <any> registry.get('dgrid-body');
		registry.define('dgrid-body', body
			.around('diffProperties', function(diffProperties: () => string[]) {
				// add collection check (by reference) to dgrid-body
				return function(previousProperties: HasCollection, newProperties: HasCollection) {
					const changedPropertyKeys = diffProperties.apply(this, arguments);
					if (previousProperties.collection !== newProperties.collection) {
						changedPropertyKeys.push('collection');
					}
					return changedPropertyKeys;
				};
			})
			.override({
				getData(properties: HasCollection & HasSort) {
					const {
						dataRangeStart,
						dataRangeCount
					} = this.state;

					const {
						collection,
						sort
					} = properties;

					// TODO remove this casting when dojo/stores is updated with a new type
					let store = collection;
					if ((<any> store)['source']) {
						store = <any> (<any> store)['source'];
					}

					if (store) {
						if (dataRangeStart || dataRangeStart === 0) {
							if (dataRangeCount > 0) {
								store = store.range(dataRangeStart, dataRangeCount);
							}
							else {
								store = store.range(dataRangeStart);
							}
						}

						if (sort && sort.length) {
							const keys: string[] = [];
							const descending: boolean[] = [];
							for (const options of sort) {
								keys.push(options.property);
								descending.push(!!options.descending);
							}
							store = store.sort(createSort(keys, descending));
						}

						// TODO remove this casting when dojo/stores is updated with a new type
						if ((<any> store)['source']) {
							// if we've performed any modifications to the original store
							return store.fetch();
						}
						// otherwise, return the original store with its original modifications
						return collection.fetch();
					}

					return new Promise((resolve) => {
						resolve([]);
					});
				}
			}).around('getRowProperties', function(getRowProperties: () => any) {
				return function(item: any) {
					const properties = getRowProperties.apply(this, arguments);
					const {
						properties: {
							collection
						}
					} = this;
					properties.id = collection.identify(item);
					properties.collection = collection;
					return properties;
				};
			})
		);

		const row: DgridRowFactory = <any> registry.get('dgrid-row');
		registry.define('dgrid-row', row
			.after('getRowViewProperties', function(properties: HasCollection) {
				properties.collection = this.properties.collection;
				return properties;
			})
		);

		const rowView: DgridRowViewFactory = <any> registry.get('dgrid-row-view');
		registry.define('dgrid-row-view', rowView
			.after('getCellProperties', function(properties: HasCollection) {
				properties.collection = this.properties.collection;
				return properties;
			})
		);

		const cell: DgridCellFactory = <any> registry.get('dgrid-cell');
		registry.define('dgrid-cell', cell
			.after('getCellViewProperties', function(properties: HasCollection) {
				properties.collection = this.properties.collection;
				return properties;
			})
		);
	}
};

export default storeMixin;