var exports = module.exports = {};

var FixedDataTable = require('fixed-data-table');
var Moggio = require('./moggio.js');
var React = require('react');
var Reflux = require('reflux');
var Router = require('react-router');
var _ = require('underscore');

var { Button, TextField } = require('./mdl.js');

var Column = FixedDataTable.Column;
var Link = Router.Link;
var Table = FixedDataTable.Table;

var Tracks = exports.Tracks = React.createClass({
	mixins: [Reflux.listenTo(Stores.active, 'setActive')],
	getDefaultProps: function() {
		return {
			tracks: []
		};
	},
	getInitialState: function() {
		var init = {
			sort: this.props.initSort || 'Title',
			asc: true,
			tracks: [],
			search: '',
			tableWidth: 0,
		};
		if (this.props.isqueue || this.props.useIdxAsNum) {
			init.sort = 'Track';
		}
		this.update(null, this.props.tracks);
		return init;
	},
	componentWillReceiveProps: function(next) {
		this.update(null, next.tracks);
	},
	setActive: function() {
		this.forceUpdate();
	},
	mkparams: function() {
		return _.map(this.state.tracks, function(t, i) {
			return ['add', t.ID.UID];
		});
	},
	play: function() {
		var params = this.mkparams();
		params.unshift(['clear']);
		Moggio.POST('/api/queue/change', params, function() {
			Moggio.POST('/api/cmd/play');
		});
	},
	add: function() {
		var params = this.mkparams();
		Moggio.POST('/api/queue/change', params);
	},
	playTrack: function(index) {
		return function() {
			if (this.props.isqueue) {
				idx = this.getIdx(index);
				Moggio.POST('/api/cmd/play_idx?idx=' + idx);
			} else {
				Moggio.POST('/api/cmd/play_track', this.getter(index).ID.UID);
			}
		}.bind(this);
	},
	appendTrack: function(index) {
		return function() {
			var params;
			if (this.props.isqueue) {
				var idx = this.getIdx(index);
				params = [
					['rem', idx.toString()],
				];
			} else {
				params = [
					['add', this.getter(index).ID.UID]
				];
			}
			Moggio.POST('/api/queue/change', params);
		}.bind(this);
	},
	sort: function(field) {
		return function() {
			if (this.state.sort == field) {
				this.update({asc: !this.state.asc});
			} else {
				this.update({sort: field});
			}
		}.bind(this);
	},
	sortClass: function(field) {
		if (this.props.isqueue) {
			return '';
		}
		var name = 'clickable ';
		if (this.state.sort == field) {
			name += this.state.asc ? 'sort-asc' : 'sort-desc';
		}
		return name;
	},
	handleResize: function() {
		this.update(this.getTableWidth());
	},
	getTableWidth: function() {
		var n = React.findDOMNode(this.refs.table);
		var w = window.innerWidth - n.offsetLeft;
		return {tableWidth: w};
	},
	componentDidMount: function() {
		window.addEventListener('resize', this.handleResize);
		var w = this.getTableWidth();
		this.update(w, this.props.tracks);
	},
	componentWillUnmount: function() {
		window.removeEventListener('resize', this.handleResize);
	},
	update: function(obj, next) {
		if (!this.isMounted()) {
			return;
		}
		if (this.refs && this.refs.table) {
			var d = this.refs.table.getDOMNode();
			height = window.innerHeight - d.offsetTop - 82;
			this.setState({height: height});
		}
		if (obj) {
			this.setState(obj);
		}
		obj = _.extend({}, this.state, obj);
		var tracks = next || this.props.tracks;
		if (next) {
			_.each(tracks, function(v, i) {
				v.idx = i + 1;
			});
		}
		if (obj.search) {
			var s = obj.search.toLocaleLowerCase().trim();
			tracks = _.filter(tracks, function(v) {
				var t = v.Info.Title + v.Info.Album + v.Info.Artist + v.ID.Protocol;
				t = t.toLocaleLowerCase();
				return t.indexOf(s) > -1;
			});
		}
		var useIdx = (obj.sort == 'Track' && this.props.useIdxAsNum) || this.props.isqueue;
		tracks = _.sortBy(tracks, function(v) {
			return v.Info.Track;
		});
		tracks = _.sortBy(tracks, function(v) {
			if (useIdx) {
				return v.idx;
			}
			var d = v.Info[obj.sort];
			if (obj.sort == "Source") {
				d = v.ID.UID;
			}
			if (_.isString(d)) {
				d = d.toLocaleLowerCase();
			}
			return d;
		}.bind(this));
		if (!obj.asc) {
			tracks.reverse();
		}
		this.setState({tracks: tracks});
	},
	search: function(event) {
		this.update({search: event.target.value});
	},
	getter: function(index) {
		return this.state.tracks[index];
	},
	getIdx: function(index) {
		return this.getter(index).idx - 1;
	},
	timeCellRenderer: function(str, key, data, index) {
		return <div><Moggio.Time time={data.Info.Time} /></div>;
	},
	timeHeader: function() {
		return function() {
			return <Moggio.Icon name='schedule' className={this.sortClass('Time')} onClick={this.sort('Time')} />;
		}.bind(this);
	},
	mkHeader: function(name, text) {
		if (!text) {
			text = name;
		}
		if (this.props.isqueue) {
			return function() {
				return text;
			};
		}
		return function() {
			return <div className={this.sortClass(name)} onClick={this.sort(name)}>{text}</div>;
		}.bind(this);
	},
	trackRenderer: function(str, key, data, index) {
		var track = data.Info.Track || '';
		if (this.props.useIdxAsNum) {
			track = data.idx;
		} else if (this.props.noIdx) {
			track = '';
		}
		return (
			<div style={{padding: '0'}}>
				<span className="nohover" style={{padding: '12px'}}>{track}</span>
				<span className="hover">
					<Button onClick={this.playTrack(index)} icon={true}>
						<Moggio.Icon name="play_arrow"/>
					</Button>
				</span>
			</div>
		);
	},
	titleCellRenderer: function(str, key, data, index) {
		var image;
		if (data.Info.ImageURL) {
			image = <img className="track-image" src={data.Info.ImageURL}/>;
		} else {
			image = <span className="track-image mdl-color--grey-300" />;
		}
		return (
			<div className="track-title">
				{image}
				{data.Info.Title}
				<span className="hover pull-right">
					<Button onClick={this.appendTrack(index)} icon={true}>
						<Moggio.Icon name={this.props.isqueue ? 'clear' : 'add'} />
					</Button>
				</span>
			</div>
		);
	},
	artistCellRenderer: function(str, key, data, index) {
		return <div><Link to="artist" params={data.Info}>{data.Info.Artist}</Link></div>;
	},
	albumCellRenderer: function(str, key, data, index) {
		return <div><Link to="album" params={data.Info}>{data.Info.Album}</Link></div>;
	},
	sourceCellRenderer: function(str, key, data, index) {
		return <div title={data.ID.ID + "|" + data.ID.Key + "|" + data.ID.Protocol}>{data.ID.Protocol}</div>;
	},
	rowClassNameGetter: function(index) {
		var g = this.getter(index);
		if (g.ID.UID == Stores.active.data) {
			return 'active';
		}
		return null;
	},
	render: function() {
		var height = this.state.height || 0;
		var queue;
		if (!this.props.isqueue) {
			queue = (
				<div>
					<Button onClick={this.play} raised={true} primary={true}>play</Button>
					&nbsp;
					<Button onClick={this.add} raised={true} accent={true}>add</Button>
					&nbsp;
					({this.state.tracks.length} tracks)
				</div>
			);
		};
		var track = this.props.isqueue ? <th></th> : <th className={this.sortClass('Track')} onClick={this.sort('Track')}>#</th>;
		return (
			<div>
				{queue}
				<TextField style={{width: this.state.tableWidth - 2}} onChange={this.search} value={this.state.search}>search</TextField>
				<Table ref="table"
					headerHeight={50}
					rowHeight={50}
					rowGetter={this.getter}
					rowsCount={this.state.tracks.length}
					rowClassNameGetter={this.rowClassNameGetter}
					width={this.state.tableWidth}
					height={height}
					overflowX={'hidden'}
					>
					<Column
						width={50}
						dataKey={'Track'}
						headerRenderer={this.mkHeader('Track', '#')}
						cellRenderer={this.trackRenderer}
					/>
					<Column
						width={200}
						flexGrow={3}
						cellClassName="nowrap"
						dataKey={'Title'}
						headerRenderer={this.mkHeader('Title')}
						cellRenderer={this.titleCellRenderer}
					/>
					<Column
						width={65}
						dataKey={'Time'}
						cellRenderer={this.timeCellRenderer}
						headerRenderer={this.timeHeader()}
					/>
					<Column
						width={100}
						flexGrow={1}
						dataKey={'Artist'}
						cellRenderer={this.artistCellRenderer}
						cellClassName="nowrap"
						headerRenderer={this.mkHeader('Artist')}
					/>
					<Column
						width={100}
						flexGrow={1}
						dataKey={'Album'}
						cellRenderer={this.albumCellRenderer}
						cellClassName="nowrap"
						headerRenderer={this.mkHeader('Album')}
					/>
					<Column
						width={100}
						cellClassName="nowrap"
						dataKey={'Source'}
						cellRenderer={this.sourceCellRenderer}
						headerRenderer={this.mkHeader('Source')}
					/>
				</Table>
			</div>
		);
	}
});

exports.TrackList = React.createClass({
	mixins: [Reflux.listenTo(Stores.tracks, 'setState')],
	getInitialState: function() {
		return Stores.tracks.data || {};
	},
	render: function() {
		return (
			<div>
				<div className="mdl-typography--display-3 mdl-color-text--grey-600">Music</div>
				<Tracks tracks={this.state.Tracks} />
			</div>
		);
	}
});

function searchClass(field, sort) {
	return React.createClass({
		mixins: [Reflux.listenTo(Stores.tracks, 'setState')],
		render: function() {
			if (!Stores.tracks.data) {
				return null;
			}
			var tracks = [];
			var prop = this.props.params[field];
			_.each(Stores.tracks.data.Tracks, function(val) {
				if (val.Info[field] == prop) {
					tracks.push(val);
				}
			});
			return (
				<div>
					<div className="mdl-typography--display-3 mdl-color-text--grey-600"><Link to="app">Music</Link> &gt; {prop}</div>
					<Tracks tracks={tracks} initSort={sort} />
				</div>
			);
		}
	});
}

exports.Artist = searchClass('Artist', 'Album');
exports.Album = searchClass('Album', 'Track');
